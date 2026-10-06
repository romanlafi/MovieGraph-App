import json
import unittest
from urllib.parse import parse_qs, urlparse
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.application import create_app
from app.catalogue.client import TMDBClient, TMDBSettings
from app.catalogue.routes import get_tmdb_client
from test_foundation import isolated


def movie(tmdb_id):
    return {"id": tmdb_id, "title": f"Movie {tmdb_id}", "release_date": "2026-01-01",
            "poster_path": "/poster.jpg", "backdrop_path": "/backdrop.jpg", "vote_average": 8}


class CatalogueBrowseTests(unittest.TestCase):
    def setUp(self):
        self.transport = AsyncMock()
        self.gateway = TMDBClient(TMDBSettings(read_token="private-token"), self.transport)
        self.app = create_app(include_legacy_api=False)
        self.app.dependency_overrides[get_tmdb_client] = lambda: self.gateway
        self.client = TestClient(self.app)

    def respond(self, data):
        self.transport.return_value = (200, json.dumps(data))

    def test_pagination_preserves_all_rows_across_tmdb_page_boundaries(self):
        async def transport(url, headers, timeout):
            page = int(parse_qs(urlparse(url).query)["page"][0])
            return 200, json.dumps({"results": [movie(index) for index in range((page - 1) * 20 + 1, page * 20 + 1)]})
        self.transport.side_effect = transport
        for limit in (10, 18, 20):
            ids = []
            for page in (1, 2, 3):
                response = self.client.get("/api/tmdb/movies", params={"kind": "top-rated", "page": page, "limit": limit})
                self.assertEqual(response.status_code, 200)
                ids.extend(row["tmdb_id"] for row in response.json())
            self.assertEqual(ids, list(range(1, 3 * limit + 1)))

    def test_invalid_parameters_do_not_call_upstream(self):
        for path in ("movies?kind=unknown", "movies?kind=latest&page=0", "movies?kind=popular&limit=21",
                     "movies?kind=genre", "movies?kind=genre&tmdb_genre_id=-1", "movies/featured?limit=6",
                     "collection/0", "person/0/filmography", "movie/0/recommendations"):
            self.assertEqual(self.client.get(f"/api/tmdb/{path}").status_code, 422, path)
        self.transport.assert_not_called()

    def test_movie_detail_combines_credits_videos_and_collection_without_local_ids(self):
        self.respond({**movie(550), "genres": [{"id": 18, "name": "Drama"}],
                      "belongs_to_collection": {"id": 10, "name": "Collection"},
                      "credits": {"cast": [{"id": 287, "name": "Brad", "character": "Tyler"}],
                                  "crew": [{"id": 287, "name": "Brad", "job": "Director"}]},
                      "videos": {"results": [{"site": "YouTube", "type": "Trailer", "key": "abc"}]},
                      "api_key": "private-token"})
        response = self.client.get("/api/tmdb/movie/550")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["cast"][0]["tmdb_id"], 287)
        self.assertEqual(data["cast"][0]["role"], "ACTOR, DIRECTOR")
        self.assertEqual(data["genres"], [{"tmdb_id": 18, "name": "Drama"}])
        self.assertEqual(data["collection"]["tmdb_id"], 10)
        self.assertEqual(data["trailer_youtube_key"], "abc")
        self.assertNotIn('"id":', response.text)
        self.assertNotIn("private-token", response.text)
        self.assertIn("append_to_response=credits%2Cvideos", self.transport.call_args.args[0])
        self.transport.assert_awaited_once()

    def test_lists_use_intentional_tmdb_sources(self):
        self.respond({"results": [movie(550)]})
        for kind, expected in (("top-rated", "/movie/top_rated"), ("latest", "/discover/movie"),
                               ("genre", "/discover/movie"), ("popular", "/movie/popular")):
            response = self.client.get("/api/tmdb/movies", params={"kind": kind, "tmdb_genre_id": 18})
            self.assertEqual(response.status_code, 200)
            url = self.transport.call_args.args[0]
            self.assertIn(expected, url)
            if kind == "genre":
                self.assertIn("with_genres=18", url)
            if kind == "latest":
                self.assertIn("primary_release_date.lte=", url)
                self.assertIn("vote_count.gte=10", url)

    def test_collection_and_filmography_preserve_tmdb_identity_and_deduplicate(self):
        self.respond({"id": 10, "name": "Collection", "parts": [movie(2), {**movie(1), "release_date": "2000-01-01"}]})
        response = self.client.get("/api/tmdb/collection/10")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["tmdb_id"] for row in response.json()["movies"]], [1, 2])
        self.respond({"cast": [movie(550), movie(550)], "crew": [{**movie(680), "job": "Director"},
                                                                              {**movie(155), "job": "Producer"}]})
        response = self.client.get("/api/tmdb/person/287/filmography")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["tmdb_id"] for row in response.json()["acted"]], [550])
        self.assertEqual([row["tmdb_id"] for row in response.json()["directed"]], [680])

    def test_new_routes_map_failures_and_malformed_payloads(self):
        paths = ("movies?kind=latest", "genres", "collection/10", "person/287/filmography",
                 "people/featured", "movie/550/recommendations")
        for path in paths:
            for status, body in ((429, "private-token"), (200, "{}"), (200, '{"results": [null]}')):
                self.transport.return_value = (status, body)
                response = self.client.get(f"/api/tmdb/{path}")
                self.assertIn(response.status_code, (502, 503), path)
                self.assertNotIn("private-token", response.text)
        self.respond({"results": {}})
        self.assertEqual(self.client.get("/api/tmdb/movies?kind=top-rated").status_code, 502)

    def test_catalogue_browse_cannot_import_database_or_mirror(self):
        result = isolated('''
import importlib.abc, json, sys
class BlockDatabase(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname.startswith(('sqlalchemy', 'app.db', 'app.models', 'app.services.postgres', 'app.services.tmdb_service')):
            raise AssertionError(fullname)
sys.meta_path.insert(0, BlockDatabase())
from fastapi.testclient import TestClient
from app.application import create_app
from app.catalogue.client import TMDBClient, TMDBSettings
from app.catalogue.routes import get_tmdb_client
async def transport(url, headers, timeout):
    data = {'id': 10, 'name': 'Collection', 'parts': [], 'results': [], 'genres': [], 'cast': [], 'crew': []}
    return 200, json.dumps(data)
app = create_app(include_legacy_api=False)
app.dependency_overrides[get_tmdb_client] = lambda: TMDBClient(TMDBSettings(api_key='test'), transport)
with TestClient(app) as client:
    for path in ('movies?kind=latest', 'movies?kind=genre&tmdb_genre_id=18', 'movies/featured', 'genres',
                 'collections', 'collection/10', 'people/featured', 'person/287/filmography',
                 'person/287/related', 'movie/550/recommendations'):
        response = client.get('/api/tmdb/' + path)
        assert response.status_code == 200, (path, response.text)
''')
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_featured_movies_keep_successful_results_when_one_detail_fails(self):
        async def transport(url, headers, timeout):
            if "/trending/movie/week" in url:
                return 200, json.dumps({"results": [movie(1), movie(2)]})
            if "/movie/1?" in url:
                return 200, json.dumps(movie(1))
            return 500, "private-token"
        self.transport.side_effect = transport
        response = self.client.get("/api/tmdb/movies/featured?limit=2")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["tmdb_id"] for row in response.json()], [1])

    def test_related_people_rank_shared_credits_exclude_subject_and_tolerate_failure(self):
        async def transport(url, headers, timeout):
            if "movie_credits" in url:
                return 200, json.dumps({"cast": [movie(1), movie(2), movie(3)], "crew": []})
            if "/movie/3/credits" in url:
                return 500, "private-token"
            cast = [{"id": 287, "name": "Subject"}, {"id": 20, "name": "Recurring"}]
            if "/movie/1/credits" in url:
                cast.append({"id": 10, "name": "One appearance"})
            return 200, json.dumps({"cast": cast, "crew": []})
        self.transport.side_effect = transport
        response = self.client.get("/api/tmdb/person/287/related")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["tmdb_id"] for row in response.json()], [20, 10])
