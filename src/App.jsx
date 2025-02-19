import { useState } from "react"
import Home from "./pages/Home"
import CommunityDetails from "./pages/CommunityDetails"

function App() {
  const [selectedCommunity, setSelectedCommunity] = useState(null)

  return (
    <div className="app">
      {selectedCommunity ? (
        <CommunityDetails 
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

