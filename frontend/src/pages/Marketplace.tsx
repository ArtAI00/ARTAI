import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  SimpleGrid,
  VStack,
  HStack,
  Text,
  Button,
  Image,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  NumberInput,
  NumberInputField,
} from '@chakra-ui/react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getListings, createListing, purchaseNFT } from '../services/marketplace';
import { NFTListing } from '../types';

const Marketplace: React.FC = () => {
  const [listings, setListings] = useState<NFTListing[]>([]);
  const [selectedNFT, setSelectedNFT] = useState<NFTListing | null>(null);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const toast = useToast();

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const data = await getListings(connection);
      setListings(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch listings',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (listing: NFTListing) => {
    if (!publicKey) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setLoading(true);
      await purchaseNFT(connection, publicKey, listing);
      await fetchListings();
      toast({
        title: 'Success',
        description: 'NFT purchased successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to purchase NFT',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async (price: number) => {
    if (!selectedNFT || !publicKey) return;

    try {
      setLoading(true);
      await createListing(connection, publicKey, selectedNFT, price);
      await fetchListings();
      onClose();
      toast({
        title: 'Success',
        description: 'Listing created successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create listing',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <HStack justify="space-between">
          <Text fontSize="2xl" fontWeight="bold">
            NFT Marketplace
          </Text>
          {!publicKey ? (
            <WalletMultiButton />
          ) : null}
        </HStack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {listings.map((listing) => (
            <Box
              key={listing.id}
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              _hover={{ shadow: 'lg' }}
            >
              <Image
                src={listing.image}
                alt={listing.name}
                height="300px"
                width="100%"
                objectFit="cover"
              />
              <Box p={6}>
                <Box d="flex" alignItems="baseline">
                  <Badge borderRadius="full" px="2" colorScheme="blue">
                    {listing.style}
                  </Badge>
                </Box>

                <Box
                  mt="1"
                  fontWeight="semibold"
                  as="h4"
                  lineHeight="tight"
                  isTruncated
                >
                  {listing.name}
                </Box>

                <Box>
                  {listing.price} SOL
                  <Box as="span" color="gray.600" fontSize="sm">
                    / Fixed Price
                  </Box>
                </Box>

                <Button
                  mt={4}
                  colorScheme="blue"
                  width="full"
                  onClick={() => handlePurchase(listing)}
                  isLoading={loading}
                  isDisabled={!publicKey || listing.seller === publicKey.toString()}
                >
                  {listing.seller === publicKey?.toString()
                    ? 'Your Listing'
                    : 'Purchase'}
                </Button>
              </Box>
            </Box>
          ))}
        </SimpleGrid>

        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Create Listing</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              {selectedNFT && (
                <VStack spacing={4}>
                  <Image
                    src={selectedNFT.image}
                    alt={selectedNFT.name}
                    borderRadius="md"
                  />
                  <Text fontWeight="bold">{selectedNFT.name}</Text>
                  <NumberInput min={0} precision={2}>
                    <NumberInputField placeholder="Price in SOL" />
                  </NumberInput>
                  <Button
                    colorScheme="blue"
                    width="full"
                    onClick={() => handleCreateListing(0)}
                    isLoading={loading}
                  >
                    Create Listing
                  </Button>
                </VStack>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  );
};

export default Marketplace;