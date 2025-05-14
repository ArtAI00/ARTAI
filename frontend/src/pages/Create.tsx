import React, { useState, useCallback } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Select,
  Image,
  useToast,
  Progress,
  Grid,
} from '@chakra-ui/react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { generateArt } from '../services/ai';
import { mintNFT } from '../services/nft';

const Create: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('cyberpunk');
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const toast = useToast();

  const handleGenerate = async () => {
    if (!prompt) {
      toast({
        title: 'Error',
        description: 'Please enter a prompt',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setGenerating(true);
      const response = await generateArt({
        prompt,
        style,
        num_images: 4,
        quality: 'high',
      });

      setImages(response.images);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate art',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleMint = async () => {
    if (!selectedImage || !publicKey) {
      toast({
        title: 'Error',
        description: 'Please select an image and connect wallet',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      const metadata = {
        name: `Art.AI Creation - ${prompt.slice(0, 20)}...`,
        description: prompt,
        image: selectedImage,
        attributes: [{ trait_type: 'Style', value: style }],
      };

      await mintNFT(connection, publicKey, metadata);

      toast({
        title: 'Success',
        description: 'NFT minted successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mint NFT',
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Text fontSize="2xl" fontWeight="bold" mb={4}>
            Create AI Art
          </Text>
          <VStack spacing={4}>
            <Input
              placeholder="Describe your imagination..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              size="lg"
            />
            <Select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              size="lg"
            >
              <option value="cyberpunk">Cyberpunk</option>
              <option value="surreal">Surrealism</option>
              <option value="3d_render">3D Render</option>
              <option value="pixel_art">Pixel Art</option>
            </Select>
            <Button
              colorScheme="blue"
              size="lg"
              isLoading={generating}
              onClick={handleGenerate}
              width="full"
            >
              Generate Art
            </Button>
          </VStack>
        </Box>

        {generating && (
          <Box>
            <Text mb={2}>Generating your masterpiece...</Text>
            <Progress size="xs" isIndeterminate />
          </Box>
        )}

        {images.length > 0 && (
          <Box>
            <Text fontSize="xl" fontWeight="bold" mb={4}>
              Generated Results
            </Text>
            <Grid templateColumns="repeat(2, 1fr)" gap={6}>
              {images.map((image, index) => (
                <Box
                  key={index}
                  cursor="pointer"
                  onClick={() => setSelectedImage(image)}
                  borderWidth={selectedImage === image ? 4 : 1}
                  borderColor={selectedImage === image ? 'blue.500' : 'gray.200'}
                  borderRadius="md"
                  overflow="hidden"
                >
                  <Image src={`data:image/png;base64,${image}`} alt={`Generated art ${index + 1}`} />
                </Box>
              ))}
            </Grid>

            <HStack mt={6} spacing={4}>
              {!publicKey ? (
                <WalletMultiButton />
              ) : (
                <Button
                  colorScheme="green"
                  size="lg"
                  onClick={handleMint}
                  isDisabled={!selectedImage}
                >
                  Mint as NFT
                </Button>
              )}
            </HStack>
          </Box>
        )}
      </VStack>
    </Container>
  );
};

export default Create;