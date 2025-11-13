import './App.css'
import StampForm from './components/StampForm'

function App() {
    return (
        <div className="App">
            <h1>スタンプシステム</h1>
            <StampForm userId={1} roomId={1} />
        </div>
    )
}

export default App