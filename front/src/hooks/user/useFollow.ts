import {useContext} from "react";
import {FollowContext} from "../../contexts/FollowContext.ts";

export const useFollow = () => {
    const context = useContext(FollowContext);
    if (!context) {
        throw new Error("useFollow must be used within a FollowProvider");
    }
    return context;
};
