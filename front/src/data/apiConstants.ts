export const BASE_URL = "http://192.168.1.250:8000/api/v1";
//const BASE_URL = "http://192.168.1.175:8001/api/v1";
//const BASE_URL = "http://moviegraph-back:8001/api/v1";

export const API_ENDPOINTS = {
    USERS: `${BASE_URL}/users`,
    MOVIES: `${BASE_URL}/movies`,
    PEOPLE: `${BASE_URL}/people`,
    COMMENTS: `${BASE_URL}/comments`,
};

export const HTTP_STATUS = {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
};