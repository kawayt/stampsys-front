// src/config/dbAdminConfig.js

const dbAdminConfig = {
    // ■ classes: クラス
    classes: {
        tableLabel: "クラス",
        labels: {
            class_id: "クラスID",
            class_name: "クラス名",
            created_at: "作成日時",
            updated_at: "更新日時",
            deleted_at: "削除日時（復元は空にする）",
        },
        readonly: ["class_id", "created_at", "updated_at"],
    },

    // ■ notes: メモ
    notes: {
        tableLabel: "メモ",
        labels: {
            note_id: "メモID",
            note_text: "メモ内容",
            room_id: "ルームID",
            user_id: "ユーザーID",
            sent_at: "送信日時",
            created_at: "作成日時",
            hidden: "非表示",
        },
        readonly: ["note_id", "created_at", "sent_at"],
        lookups: {
            room_id: { table: "rooms", label: "room_name" },
            user_id: { table: "users", label: "user_name" },
        },
    },

    // ■ rooms: ルーム
    rooms: {
        tableLabel: "ルーム",
        labels: {
            room_id: "ルームID",
            room_name: "教室名",
            class_id: "クラスID",
            capacity: "収容人数",
            created_at: "作成日時",
        },
        readonly: ["room_id", "created_at"],
        lookups: {
            class_id: { table: "classes", label: "class_name" },
        },
    },

    // ■ stamp_logs: スタンプログ
    stamp_logs: {
        tableLabel: "スタンプログ",
        labels: {
            log_id: "ログID",
            user_id: "ユーザーID",
            stamp_id: "スタンプID",
            sent_at: "送信日時",
            created_at: "作成日時",
        },
        readonly: ["log_id", "created_at", "pressed_at"],
        lookups: {
            user_id: { table: "users", label: "user_name" },
            stamp_id: { table: "stamps", label: "stamp_name" },
        },
    },

    // ■ stamps: スタンプ
    stamps: {
        tableLabel: "スタンプ",
        labels: {
            stamp_id: "スタンプID",
            stamp_name: "スタンプ名",
            stamp_icon: "アイコン",
            stamp_color: "色",
            created_at: "作成日時",
            // システム上の論理削除カラムが deleted_at の場合と stamp_deleted の場合の両方に対応
            deleted_at: "削除日時",
            stamp_deleted: "削除日時",
        },
        readonly: ["stamp_id", "created_at"],
    },

    // ■ stamps_classes: スタンプとクラスの関連
    stamps_classes: {
        tableLabel: "スタンプとクラスの関連",
        labels: {
            id: "ID",
            stamp_id: "スタンプID",
            class_id: "クラスID",
            created_at: "作成日時",
        },
        readonly: ["id", "created_at"],
        lookups: {
            stamp_id: { table: "stamps", label: "stamp_name" },
            class_id: { table: "classes", label: "class_name" },
        },
    },

    // ■ users: ユーザー
    users: {
        tableLabel: "ユーザー",
        labels: {
            user_id: "ユーザーID",
            user_name: "氏名",
            email: "メールアドレス",
            role: "権限",
            hidden: "非表示",
            provider_user_id: "連携ID",
            created_at: "作成日時",
        },
        readonly: ["user_id", "provider_user_id", "created_at"],
    },

    // ■ users_classes: ユーザーのクラス情報
    users_classes: {
        tableLabel: "ユーザーのクラス情報",
        labels: {
            id: "ID",
            user_id: "ユーザーID",
            class_id: "クラスID",
            created_at: "作成日時",
        },
        readonly: ["id", "created_at"],
        lookups: {
            user_id: { table: "users", label: "user_name" },
            class_id: { table: "classes", label: "class_name" },
        },
    },
};

export default dbAdminConfig;