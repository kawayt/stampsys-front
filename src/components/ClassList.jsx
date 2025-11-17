import { useEffect, useState } from "react";

export function ClassList() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                // Vite の dev サーバーで /api を 8080 にプロキシしている前提
                const res = await fetch("/api/classes/list");
                if (!res.ok) {
                    throw new Error(`Failed to fetch classes: ${res.status}`);
                }
                const data = await res.json();
                setClasses(data);
            } catch (err) {
                console.error(err);
                setError(err.message ?? "エラーが発生しました");
            } finally {
                setLoading(false);
            }
        };

        fetchClasses();
    }, []);

    if (loading) {
        return <p>読み込み中...</p>;
    }

    if (error) {
        return <p>エラー: {error}</p>;
    }

    if (!classes || classes.length === 0) {
        return (
            <div>
                <h2>クラス一覧</h2>
                <p>クラスが登録されていません。</p>
            </div>
        );
    }

    return (
        <div>
            <h2>クラス一覧</h2>
            <ul>
                {classes.map((c) => (
                    <li key={c.classId}>
                        <strong>{c.className}</strong>
                        {c.classId != null && <>（ID: {c.classId}）</>}
                        {c.createdAt && (
                            <span style={{ marginLeft: "0.5rem", color: "#666" }}>
                作成日時: {new Date(c.createdAt).toLocaleString()}
              </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}