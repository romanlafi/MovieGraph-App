import {useContext} from "react";
import {AuthContext} from "../../contexts/AuthContext.ts";

export const useAuth = () => useContext(AuthContext);