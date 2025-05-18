export const BASE_URL = import.meta.env.VITE_API_PROD_URL;

export const API_ENDPOINTS = {
    USERS: `${BASE_URL}/users`,
    MOVIES: `${BASE_URL}/movies`,
    PEOPLE: `${BASE_URL}/people`,
    COMMENTS: `${BASE_URL}/comments`,
    FRIENDS: `${BASE_URL}/friends`,
};

export const API_MOVIES = "/movies";
export const API_AUTH = "/users";
export const API_COMMENTS = "/comments";
export const API_PEOPLE = "/people";
export const API_FOLLOWS = "/follows";
export const API_RECOMMENDATIONS = "/recommendations";