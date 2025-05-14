import UserProfileCard from "./UserProfileCard.tsx";

interface FriendsGridProps {
    friends: any[];
}

export default function FriendsGrid({ friends }: FriendsGridProps) {
    if (!friends.length) {
        return <p className="text-white/70">You don't have any friends yet.</p>;
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {friends.map((friend) => (
                <UserProfileCard key={friend.id} user={friend} />
            ))}
        </div>
    );
}