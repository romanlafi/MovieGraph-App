export default function CountryFlag({ code }: { code: string }) {
    return (
        <img
            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
            alt={code}
            title={code}
            className="w-6 h-4 object-cover rounded shadow border border-white/20"
        />
    );
}