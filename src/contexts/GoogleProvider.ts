// import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// declare global {
//   interface Window {
//     google: any;
//   }
// }

// type GoogleContextType = {
//   isConnected: boolean;
//   connectGoogle: () => void;
//   createEvent: (event: any) => Promise<void>;
// };

// const GoogleContext = createContext<GoogleContextType | null>(null);

// const CLIENT_ID = 'YOUR_CLIENT_ID';
// const SCOPES = 'https://www.googleapis.com/auth/calendar';

// type Props = {
//   children: ReactNode;
// };

// export function GoogleProvider({ children }: Props) {
//   const [accessToken, setAccessToken] = useState<string | null>(null);
//   const [tokenClient, setTokenClient] = useState<any>(null);

//   useEffect(() => {
//     if (!window.google) return;

//     const client = window.google.accounts.oauth2.initTokenClient({
//       client_id: CLIENT_ID,
//       scope: SCOPES,
//       callback: (response: any) => {
//         if (response.access_token) {
//           setAccessToken(response.access_token);
//           localStorage.setItem('google_token', response.access_token);
//         }
//       },
//     });

//     setTokenClient(client);

//     const saved = localStorage.getItem('google_token');
//     if (saved) setAccessToken(saved);
//   }, []);

//   const connectGoogle = () => {
//     tokenClient?.requestAccessToken({ prompt: 'consent' });
//   };

//   const createEvent = async (event: any) => {
//     if (!accessToken) throw new Error('Google not connected');

//     await fetch(
//       'https://www.googleapis.com/calendar/v3/calendars/primary/events',
//       {
//         method: 'POST',
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(event),
//       }
//     );
//   };

//   return (
//     <GoogleContext.Provider
//       value={{
//         isConnected: !!accessToken,
//         connectGoogle,
//         createEvent,
//       }}
//     >
//       {children}
//     </GoogleContext.Provider>
//   );
// }

// export function useGoogle() {
//   const context = useContext(GoogleContext);
//   if (!context) throw new Error('useGoogle must be inside GoogleProvider');
//   return context;
// }