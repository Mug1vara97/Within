class Room {
    constructor(id, router, io) {
        this.id = id;
        this.router = router;
        this.io = io;
        this.peers = new Map();
        this.peerStates = new Map();
        this.producers = new Map();
        this.consumers = new Map();
        this.transports = new Map();
        this.screenProducers = new Map();
    }

    addPeer(peerId, peer) {
        this.peers.set(peerId, peer);
        // Инициализируем состояние пира
        this.peerStates.set(peerId, {
            userName: peer.data?.userName || 'Unknown',
            isMuted: peer.isMuted || false,
            isAudioEnabled: peer.isAudioEnabled || true
        });
        
        // Broadcast new peer's state to all peers in the room
        this.io.to(this.id).emit('peerMuteStateChanged', {
            peerId: peerId,
            isMuted: Boolean(peer.isMuted())
        });

        // Also broadcast audio state
        this.io.to(this.id).emit('peerAudioStateChanged', {
            peerId: peerId,
            isEnabled: Boolean(peer.isAudioEnabled())
        });

        console.log(`Peer ${peerId} added to room ${this.id}`);
    }

    removePeer(peerId) {
        // First, close all screen sharing producers for this peer
        this.producers.forEach((producerData, producerId) => {
            if (producerData.peerId === peerId && producerData.producer.appData?.mediaType === 'screen') {
                this.removeProducer(producerId);
            }
        });

        // Then close all other producers
        this.producers.forEach((producerData, producerId) => {
            if (producerData.peerId === peerId) {
                this.removeProducer(producerId);
            }
        });

        // Close all consumers
        this.consumers.forEach((consumerData, consumerId) => {
            if (consumerData.peerId === peerId) {
                try {
                    if (!consumerData.consumer.closed) {
                        consumerData.consumer.close();
                    }
                    this.consumers.delete(consumerId);
                } catch (error) {
                    console.error('Error closing consumer:', error);
                }
            }
        });

        this.peers.delete(peerId);
        this.peerStates.delete(peerId);
    }

    getPeers() {
        return new Map(Array.from(this.peers.entries()).map(([peerId, peer]) => {
            const state = this.peerStates.get(peerId) || {
                userName: peer.data?.userName || 'Unknown',
                isMuted: peer.isMuted || false,
                isAudioEnabled: peer.isAudioEnabled || true
            };
            return [peerId, { ...peer, ...state }];
        }));
    }

    getPeer(peerId) {
        const peer = this.peers.get(peerId);
        const state = this.peerStates.get(peerId);
        if (!peer) return null;
        
        const defaultState = {
            userName: peer.data?.userName || 'Unknown',
            isMuted: peer.isMuted || false,
            isAudioEnabled: peer.isAudioEnabled || true
        };
        return { ...peer, ...(state || defaultState) };
    }

    updatePeerState(peerId, update) {
        const peer = this.peers.get(peerId);
        if (!peer) return;

        // Обновляем состояние в объекте peer
        Object.assign(peer, update);

        // Обновляем состояние в peerStates
        const currentState = this.peerStates.get(peerId) || {
            userName: peer.data?.userName || 'Unknown',
            isMuted: peer.isMuted || false,
            isAudioEnabled: peer.isAudioEnabled || true
        };
        this.peerStates.set(peerId, { ...currentState, ...update });
    }

    addProducer(peerId, producer) {
        if (producer.appData?.mediaType === 'screen') {
            this.screenProducers.set(producer.id, {
                peerId,
                producer
            });
        }

        this.producers.set(producer.id, {
            peerId,
            producer
        });
    }

    getProducer(producerId) {
        const producerData = this.producers.get(producerId) || this.screenProducers.get(producerId);
        return producerData ? producerData.producer : null;
    }

    removeProducer(producerId) {
        const producerData = this.producers.get(producerId);
        if (producerData) {
          // Если это producer демонстрации экрана
          if (producerData.producer.appData?.mediaType === 'screen') {
            console.log('Cleaning up screen sharing producer:', producerId);
            
            // Находим и закрываем все consumers этой демонстрации экрана
            this.consumers.forEach((consumerData, consumerId) => {
              if (consumerData.consumer.producerId === producerId) {
                try {
                  if (!consumerData.consumer.closed) {
                    consumerData.consumer.close();
                  }
                  this.consumers.delete(consumerId);
                  
                  // Уведомляем пира о закрытии consumer
                  const peer = this.peers.get(consumerData.peerId);
                  if (peer && peer.socket) {
                    console.log('Sending consumerClosed event to peer:', consumerData.peerId);
                    const eventData = {
                      consumerId,
                      producerId,
                      producerSocketId: producerData.peerId,
                      mediaType: 'screen'
                    };
                    peer.socket.emit('consumerClosed', eventData);
                  }
                } catch (error) {
                  console.error('Error closing consumer:', error);
                }
              }
            });
            
            // Удаляем из screenProducers
            this.screenProducers.delete(producerId);
      
            // Уведомляем всех пиров о закрытом producer
            console.log('Broadcasting producerClosed event to all peers for screen sharing');
            const eventData = {
              producerId,
              producerSocketId: producerData.peerId,
              mediaType: 'screen'
            };
            this.io.to(this.id).emit('producerClosed', eventData);
          }
          
          // Закрываем producer если он все еще открыт
          try {
            if (!producerData.producer.closed) {
              producerData.producer.close();
            }
          } catch (error) {
            console.error('Error closing producer:', error);
          }
          
          this.producers.delete(producerId);
      
          // Уведомляем пиров о закрытом producer
          console.log('Broadcasting producerClosed event to all peers');
          const finalEventData = {
            producerId,
            producerSocketId: producerData.peerId,
            mediaType: producerData.producer.appData?.mediaType
          };
          this.io.to(this.id).emit('producerClosed', finalEventData);
        }
      }

    addConsumer(peerId, consumer) {
        this.consumers.set(consumer.id, {
            peerId,
            consumer
        });
    }

    getConsumer(consumerId) {
        const consumerData = this.consumers.get(consumerId);
        return consumerData ? consumerData.consumer : null;
    }

    removeConsumer(consumerId) {
        this.consumers.delete(consumerId);
    }

    async createWebRtcTransport(options) {
        const transport = await this.router.createWebRtcTransport({
            ...options,
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            enableSctp: false,
            initialAvailableOutgoingBitrate: options.initialAvailableOutgoingBitrate,
        });

        transport.on('dtlsstatechange', (dtlsState) => {
            if (dtlsState === 'closed' || dtlsState === 'failed') {
                console.log('WebRtcTransport dtls state changed to', dtlsState);
                transport.close();
                this.transports.delete(transport.id);
            }
        });

        transport.on('routerclose', () => {
            console.log('WebRtcTransport router closed');
            transport.close();
            this.transports.delete(transport.id);
        });

        transport.on('close', () => {
            console.log('WebRtcTransport closed');
            this.transports.delete(transport.id);
        });

        await transport.setMaxIncomingBitrate(options.maxIncomingBitrate);
        await transport.setMaxOutgoingBitrate(options.maxOutgoingBitrate);

        this.transports.set(transport.id, transport);
        return transport;
    }

    getTransport(transportId) {
        return this.transports.get(transportId);
    }

    getScreenProducers() {
        return Array.from(this.screenProducers.values());
    }

    isPeerSharingScreen(peerId) {
        return Array.from(this.producers.values()).some(
            producerData => producerData.peerId === peerId && 
                          producerData.producer.appData?.mediaType === 'screen'
        );
    }
}

module.exports = Room; 