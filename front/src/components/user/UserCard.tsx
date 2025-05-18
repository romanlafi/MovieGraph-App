import {Link} from "react-router-dom";
import FollowButton from "./FollowButton.tsx";
import {User} from "../../types/user.ts";
import Text from "../ui/Text.tsx";

interface Props {
    user: User;
    showFollowButton?: boolean;
    linkToProfile?: boolean;
    onFollowChange?: () => void;
}

export default function UserCard({
                                     user,
                                     showFollowButton = true,
                                     linkToProfile = true,
                                     onFollowChange,
                                 }: Props) {
    const CardContent = (
        <div className="bg-neutral-800 p-4 rounded-lg shadow min-w-[200px] max-w-[200px] flex flex-col justify-between hover:bg-neutral-700 transition">
            <Text text={user.username} size="base" truncate={true}/>
            <Text text={user.email} size="sm" color="white/60" truncate={true}/>
            {showFollowButton && (
                <div className="mt-2">
                    <FollowButton user={user} onFollowChange={onFollowChange} />
                </div>
            )}
        </div>
    );

    return linkToProfile ? (
        <Link to={`/user/${user.email}`} key={user.id}>
            {CardContent}
        </Link>
    ) : (
        <div key={user.id}>{CardContent}</div>
    );
}