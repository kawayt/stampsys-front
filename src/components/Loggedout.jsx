import React from 'react';

export default function LoggedOut() {
    return (
        <div style={{maxWidth: 960, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif'}}>
            <h1>ログアウトしました</h1>
            <p>サインアウトが完了しました。再度サインインする場合は下のボタンを押してください。</p>
            <div style={{marginTop: 16}}>
                <a href="/" style={{padding: '10px 20px', background:'#111', color:'#fff', borderRadius:4, textDecoration:'none'}}>トップへ戻る / ログイン</a>
            </div>
        </div>
    );
}