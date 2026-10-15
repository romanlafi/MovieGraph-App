import {useContext} from "react";
import {LikeContext} from "@/contexts/LikeContext.ts";

export const useLikes = () => {
    const context = useContext(LikeContext);
    if (!context) throw new Error("useLikes must be used within LikeProvider");
    return context;
};
