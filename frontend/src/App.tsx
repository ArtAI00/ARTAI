import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ChakraProvider, CSSReset } from '@chakra-ui/react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Create from './pages/Create';
import Gallery from './pages/Gallery';
import Marketplace from './pages/Marketplace';
import Profile from './pages/Profile';
import theme from './theme';

const App: React.FC = () => {
  return (
    <ChakraProvider theme={theme}>
      <CSSReset />
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<Create />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Router>
    </ChakraProvider>
  );
};

export default App;