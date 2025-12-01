// テーブルごとの編集ポリシー
// key = テーブル名
// readonly: カラム配列（強制的に編集不可）
// editable: 明示的に編集を許可するカラム配列（指定があるとこれだけ編集可）
// lookups: 外部キーのマッピング (colName -> { table: '...', label: 'labelColumn' })

const dbAdminConfig = {
    users: {
        // provider_user_id は編集不可にする（OIDC等の紐付けキー）
        readonly: ["provider_user_id", "created_at", "user_id"],
        // もし編集を限定的に許可するなら editable を使（コメント例）
        // editable: ["user_name", "email", "role", "hidden"]
        lookups: {
            // 例: users が classroom_id を持つなら、label は class_name
            // classroom_id: { table: "classes", label: "class_name" },
        },
    },

    rooms: {
        // rooms の class_id を編集可能にしたい場合は readonly に入れない。
        // created_at は自動管理なので readonly にする
        readonly: ["created_at", "room_id"],
        lookups: {
            class_id: { table: "classes", label: "class_name" },
        },
    },

    // notes の例: note.room_id を rooms のラベルで選べるようにする
    notes: {
        readonly: ["created_at", "note_id"],
        lookups: {
            room_id: { table: "rooms", label: "room_name" },
        },
    },

    // 使わないテーブルは設定不要（デフォルト動作が適用されます）
};

export default dbAdminConfig;