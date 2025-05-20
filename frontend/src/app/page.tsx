import WalletButton from '@/components/WalletButton';
import BalanceDisplay from '@/components/BalanceDisplay';
import GovernorCheck from '@/components/GovernorCheck';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              G-Naira <span className="text-green-700">(gNGN)</span>
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Nigeria&apos;s Central Bank Digital Currency
            </p>
          </div>
          <WalletButton />
        </header>
        
        <main className="flex flex-col items-center justify-center">
          <div className="w-full max-w-md">
            <BalanceDisplay />
            <GovernorCheck />
          </div>
          
          <div className="mt-16 p-6 bg-white rounded-lg shadow-md w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">About G-Naira</h2>
            <p className="text-gray-600 mb-4">
              G-Naira (gNGN) is a Central Bank Digital Currency (CBDC) 
              leveraging blockchain technology to create a secure, efficient, 
              and accessible digital version of Nigeria&apos;s currency.
            </p>
            <p className="text-gray-600 mb-4">
              This platform enables users to check their gNGN balance and 
              provides administrators with tools to manage the currency.
            </p>
            <h3 className="text-lg font-semibold mt-6 mb-2 text-gray-800">Key Features</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li>Secure token implementation with ERC20 standard</li>
              <li>Controlled mint and burn operations by authorized governors</li>
              <li>Address blacklisting capabilities for regulatory compliance</li>
              <li>Multi-signature wallet support for additional security</li>
            </ul>
          </div>
        </main>
        
        <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500">
          <p>G-Naira - The Digital Version of the Naira</p>
        </footer>
      </div>
    </div>
  );
}
