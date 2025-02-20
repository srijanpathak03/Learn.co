import { useState } from "react"
import Home from "./pages/Home"
import CommunityView from "./components/CommunityView"

function App() {
  const [selectedCommunity, setSelectedCommunity] = useState(null)

  return (
    <div className="app">
      {selectedCommunity ? (
        <CommunityView 
          community={selectedCommunity} 
          onBack={() => setSelectedCommunity(null)}
        />
      ) : (
        <Home onCommunitySelect={setSelectedCommunity} />
      )}
    </div>
  )
}

export default App

