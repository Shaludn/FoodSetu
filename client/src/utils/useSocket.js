import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const useSocket = () => {
    const socketRef = useRef(null);

    useEffect(() => {
        socketRef.current = io('http://localhost:5000');
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    return socketRef;
};

export default useSocket;