import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className='h-min-screen flex flex-col justify-between items-center p-12'>
      <h1 className='text-xl text-gray-600 font-bold border-gray-400 mb-6'><span className='text-yellow-600'>Vite</span> + <span className='text-blue-600'>React</span> + <span className='text-green-600'>Tailwind</span></h1>
      <div className='text-center space-y-6'>
        <h3 className='text-gray-600 font-bold'>Current counts: {count}</h3>
        <button 
          className='bg-purple-300 px-4 py-2 rounded cursor-pointer text-white font-bold transition-all ease-in duration-200 hover:bg-purple-500'
          onClick={() => setCount((count) => count + 1)}>
          Click Me!
        </button>
        <p className='text-gray-600 font-bold'>If you see the button is purple, then Tailwind is working!</p>
      </div>
    </div>
  )
}

export default App
