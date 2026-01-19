// src/config/dbAdminConfig.js
//
// 管理画面向けのテーブル別表示設定（ラベル / readonly / lookups 等）
// 追加・修正点:
// - stamps.hidden を非表示にする hiddenColumns を追加
// - rooms.hidden を非表示にする hiddenColumns を追加
// - stamp_logs のカラム名 stamp_log_id / log_id を「スタンプログID」に変更（両方対応）
// - users / group / その他のラベルは既存のまま
const dbAdminConfig = {
    // ■ classes: クラス
    classes: {
        tableLabel: "クラス",
        labels: {
            class_id: "クラスID",
            class_name: "クラス名",
            image: "画像",
            hidden: "非表示", // 表示自体はフロントで非表示にできる
            created_at: "作成日時",
            updated_at: "更新日時",
            deleted_at: "削除日時（復元は空にする）",
        },
        readonly: ["class_id", "created_at", "updated_at"],
        lookups: {
            // 必要ならここにルックアップ指定を追加
        },
    },

    // ■ group: 所属（名古屋 / 津 等）
    groups: {
        tableLabel: "所属（グループ）",
        labels: {
            group_id: "所属ID",
            group_name: "所属名",
        },
        readonly: ["group_id"],
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
            // 要望: active カラムは「授業中」と表示
            active: "授業中",
            hidden: "非表示",
            created_at: "作成日時",
        },
        readonly: ["room_id", "created_at"],
        lookups: {
            class_id: { table: "classes", label: "class_name" },
        },
        // フロントで非表示にするカラム名
        hiddenColumns: ["hidden"],
    },

    // ■ stamp_logs: スタンプログ
    stamp_logs: {
        tableLabel: "スタンプログ",
        labels: {
            // DB によって名前が log_id / stamp_log_id のいずれかあり得るため両方をマップ
            log_id: "スタンプログID",
            stamp_log_id: "スタンプログID",
            user_id: "ユーザーID",
            stamp_id: "スタンプID",
            // 要望: room_id を ルームID と表記
            room_id: "ルームID",
            pressed_at: "押下日時",
            sent_at: "送信日時",
            created_at: "作成日時",
        },
        readonly: ["log_id", "created_at", "pressed_at"],
        lookups: {
            user_id: { table: "users", label: "user_name" },
            stamp_id: { table: "stamps", label: "stamp_name" },
            room_id: { table: "rooms", label: "room_name" },
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
            // 要望: user_id / class_id / room_id を表示
            user_id: "ユーザーID",
            class_id: "クラスID",
            room_id: "ルームID",
            image: "画像",
            hidden: "非表示",
            created_at: "作成日時",
            // システム上の論理削除カラムが deleted_at の場合と stamp_deleted の場合の両方に対応
            deleted_at: "削除日時",
            stamp_deleted: "削除日時",
        },
        readonly: ["stamp_id", "created_at"],
        lookups: {
            user_id: { table: "users", label: "user_name" },
            class_id: { table: "classes", label: "class_name" },
            room_id: { table: "rooms", label: "room_name" },
        },
        // フロントで非表示にするカラム名
        hiddenColumns: ["hidden"],
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
            // 要望: group_id -> 所属ID, group_name -> 所属名, 画像カラムは image -> 画像
            group_id: "所属ID",
            group_name: "所属名",
            image: "画像",
            created_at: "作成日時",
        },
        readonly: ["user_id", "provider_user_id", "created_at"],
        lookups: {
            group_id: { table: "groups", label: "group_name" },
        },
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

    // 追加のテーブルがあればここに定義してください
};

export default dbAdminConfig;