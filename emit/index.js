const RPC_CONNECTION_HELPER = require('../connection');

const EVENT_EXCHANGE_NAME = 'tribe-event';

const RPC_EMIT_EVENT_HELPER = {
    ALLOWED_EVENTS_LIST: [
        
    ],
    emitEvent: async (
        eventkey, 
        data = {},
    ) => {
        try {
            // Validate eventkey
            if (RPC_EMIT_EVENT_HELPER.ALLOWED_EVENTS_LIST.indexOf(eventkey) < 0) throw new Error('Invalid event key');
            // Assert Exchange Exists (if not create)
            await RPC_CONNECTION_HELPER.channel.assertExchange(
                EVENT_EXCHANGE_NAME,
                'topic',
                { durable: true, },
            );
            // Emit eventkey with data
            await RPC_CONNECTION_HELPER.channel.publish(
                EVENT_EXCHANGE_NAME,
                eventkey,
                Buffer.from(JSON.stringify(data)),
            );
            return true;
        } catch (error) {
            return false;
        }
    },
    setEvents(_eventKeyList = []) {
        this.ALLOWED_EVENTS_LIST = _eventKeyList;
        return _eventKeyList;
    },
    addEvent(_eventKey = "") {
        this.ALLOWED_EVENTS_LIST.push(_eventKey);
        return _eventKey;
    }
};

module.exports = RPC_EMIT_EVENT_HELPER;