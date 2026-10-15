import type {User} from "@/types/user.ts";
import UserCard from "./UserCard.tsx";

interface Props {
    users: User[];
    onFollowChange?: () => void;
}

export default function UserGrid({users, onFollowChange}: Props) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {users.map(member => (
                <UserCard key={member.public_id} user={member} className="min-w-0" onFollowChange={onFollowChange} />
            ))}
        </div>
    );
}
