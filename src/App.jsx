import './App.css'
import StampForm from './components/StampForm'
import UserList from './components/UserList'

function App() {
    return (
        <div className="App">
            <h1>スタンプシステム</h1>
            <StampForm userId={1} roomId={1} />
            <UserList />
        </div>
    )
}

export default App