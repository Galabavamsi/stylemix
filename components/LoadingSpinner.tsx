
import React from 'react';

const messages = [
  "Mixing the styles...",
  "Warming up the AI stylist...",
  "Draping the fabrics...",
  "Adjusting the lighting...",
  "Perfecting the final look...",
  "This can take a minute, great style is worth the wait!"
];

export const LoadingSpinner: React.FC = () => {
    const [message, setMessage] = React.useState(messages[0]);

    React.useEffect(() => {
        let index = 0;
        const intervalId = setInterval(() => {
            index = (index + 1) % messages.length;
            setMessage(messages[index]);
        }, 3000);

        return () => clearInterval(intervalId);
    }, []);

  return (
    <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
        <div className="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-gray-700 font-light">{message}</p>
    </div>
  );
};
