import axios from "axios";

export const isNotFoundError = (error: unknown): boolean => axios.isAxiosError(error) && error.response?.status === 404;
