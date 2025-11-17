import { useEffect, useState } from "react";

function StampList() {
    const [stamps, setStamps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStamps = async () => {
            try {
                const response = await fetch("/api/stamp-management");

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                setStamps(data);
            } catch (err) {
                console.error(err);
                setError("スタンプ一覧の取得に失敗しました");
            } finally {
                setLoading(false);
            }
        };

        fetchStamps();
    }, []);

    if (loading) return <div>読み込み中...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div>
            <h1>スタンプ一覧</h1>
            <table>
                <thead>
                <tr>
                    <th>ID</th>
                    {/* StampManagementEntity のフィールド名に合わせる */}
                    <th>ラベル</th>
                    <th>カラー</th>
                    <th>アイコン</th>
                </tr>
                </thead>
                <tbody>
                {stamps.map((stamp) => (
                    <tr key={stamp.stampId /* 実際の主キー名に合わせる */}>
                        <td>{stamp.stampId}</td>
                        <td>{stamp.stampName}</td>
                        <td>{stamp.stampColor}</td>
                        <td>{stamp.stampIcon}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

export default StampList;