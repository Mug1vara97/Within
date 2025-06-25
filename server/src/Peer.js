function createPeer(socket, roomId, name) {
    return {
        id: socket.id,
        name: name,
        socket: socket,
        roomId: roomId,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
        speaking: false,
        isMuted: false,
        isAudioEnabled: true,
        screenProducers: new Map(),
        data: {
            userName: name
        },

        addProducer(producer) {
            if (producer.appData?.mediaType === 'screen') {
                this.screenProducers.set(producer.kind, producer);
            }
            this.producers.set(producer.id, producer);
        },

        getProducer(producerId) {
            return this.producers.get(producerId);
        },

        removeProducer(producerId) {
            const producer = this.producers.get(producerId);
            if (producer && producer.appData?.mediaType === 'screen') {
                this.screenProducers.delete(producer.kind);
            }
            this.producers.delete(producerId);
        },

        getScreenProducer(kind) {
            return this.screenProducers.get(kind);
        },

        hasScreenProducer(kind) {
            return this.screenProducers.has(kind);
        },

        addTransport(transport) {
            this.transports.set(transport.id, transport);
        },

        getTransport(transportId) {
            return this.transports.get(transportId);
        },

        removeTransport(transportId) {
            this.transports.delete(transportId);
        },

        addConsumer(consumer) {
            this.consumers.set(consumer.id, consumer);
        },

        getConsumer(consumerId) {
            return this.consumers.get(consumerId);
        },

        removeConsumer(consumerId) {
            this.consumers.delete(consumerId);
        },

        close() {
            this.screenProducers.forEach(producer => {
                producer.close();
            });
            this.screenProducers.clear();

            this.transports.forEach(transport => transport.close());
            this.producers.forEach(producer => producer.close());
            this.consumers.forEach(consumer => consumer.close());
            
            this.transports.clear();
            this.producers.clear();
            this.consumers.clear();
        }
    };
}

module.exports = createPeer; 