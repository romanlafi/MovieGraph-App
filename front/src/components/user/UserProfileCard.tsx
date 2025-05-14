import {User} from "../../types/user.ts";
import {FaUserFriends} from "react-icons/fa";
import FriendButton from "../common/FriendButton.tsx";

interface Props {
    user: User | any;
    isOwnProfile?: boolean;
    showAddFriend?: boolean;
}

export default function UserProfileCard({ user, isOwnProfile = false, showAddFriend = false }: Props) {
    return (
        <div className="bg-neutral-800 p-6 rounded-lg shadow space-y-2 flex flex-col items-center text-center">
            <FaUserFriends className="text-4xl text-purple-400" />
            <h3 className="text-xl font-bold text-white">{user.username}</h3>
            <p className="text-white/70 text-sm">{user.email}</p>

            {user.bio && (
                <p className="text-white/60 text-sm italic">{user.bio}</p>
            )}

            {!isOwnProfile && showAddFriend && (
                <FriendButton email={user.email} />
            )}
        </div>
    );
}