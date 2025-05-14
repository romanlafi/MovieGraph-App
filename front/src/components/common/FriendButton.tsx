import Button from "./Button.tsx";
import {addFriend} from "../../services/friendService.ts";
import {useState} from "react";

interface Props {
    email: string;
}

export default function FriendButton({ email }: Props) {
    const [loading, setLoading] = useState(false);
    const [added, setAdded] = useState(false);

    const handleAddFriend = async () => {
        try {
            setLoading(true);
            await addFriend(email);
            setAdded(true);
        } catch (err) {
            alert("Failed to send friend request");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (added) return <Button disabled>Friend Added</Button>;

    return (
        <Button onClick={handleAddFriend} disabled={loading}>
            {loading ? "Adding..." : "Add Friend"}
        </Button>
    );
}