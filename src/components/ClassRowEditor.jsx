import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * classes テーブル専用の行編集ダイアログ
 *
 * props:
 * - open: boolean
 * - mode: "create" | "update"
 * - row:  既存行（update時） / null（create時）
 * - onCancel: () => void
 * - onSubmit: (payload) => Promise<void>  // create なら insert 用、update なら update 用のAPI呼び出し
 * - submitting: boolean
 * - error: string | null
 */
export function ClassRowEditorDialog({
                                         open,
                                         mode,
                                         row,
                                         onCancel,
                                         onSubmit,
                                         submitting,
                                         error,
                                     }) {
    const [className, setClassName] = useState("");

    useEffect(() => {
        if (!open) return;
        if (mode === "update" && row) {
            setClassName(row.class_name ?? row.className ?? "");
        } else {
            setClassName("");
        }
    }, [open, mode, row]);

    const handleSubmit = async () => {
        const trimmed = className.trim();
        if (!trimmed) {
            // クライアント側で軽くバリデーション
            alert("クラス名を入力してください");
            return;
        }

        // API に渡す payload
        const payload = {
            // ここでは class_name のみをサーバーへ送る。
            // created_at / deleted_at はサーバー側でよしなに扱う想定（必要なら拡張）
            class_name: trimmed,
        };

        await onSubmit(payload);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !submitting && !o && onCancel()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-sm">
                        {mode === "create" ? "クラスを追加" : "クラスを編集"}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        クラス名のみを編集します。
                        <br />
                        作成日時や削除日時はサーバー側の処理に任せます。
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 mt-2">
                    <label className="flex flex-col gap-1 text-xs text-slate-700">
                        クラス名
                        <input
                            type="text"
                            className="border rounded px-2 py-1 text-sm"
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            disabled={submitting}
                            placeholder="例: Webアプリ開発"
                        />
                    </label>

                    {error && (
                        <p className="text-xs text-red-600 whitespace-pre-wrap">{error}</p>
                    )}
                </div>

                <DialogFooter className="flex justify-end gap-2 mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                        disabled={submitting}
                    >
                        キャンセル
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? "送信中…" : "保存"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}