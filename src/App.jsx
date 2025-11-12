import { useState } from 'react';
import { Button } from '@/components/ui/button';

function App() {
    const [count, setCount] = useState(0);

    return (
        <>
            <h1 className="text-3xl font-bold underline">Vite + React</h1>
            <div className="m-4">
                <Button onClick={() => setCount((count) => count + 1)}>
                    count is {count}
                </Button>
            </div>
        </>
    );
}

export default App;