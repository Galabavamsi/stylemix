import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { LoadingSpinner } from './components/LoadingSpinner';
import { generateLook, analyzeLookWithThinking, editImage, generateImageFromText } from './services/geminiService';
import type { UploadedFile, AppTab, AspectRatio } from './types';

const Header: React.FC = () => (
    <header className="text-center py-12">
        <h1 className="text-5xl font-normal tracking-wide text-gray-900">StyleMix Studio</h1>
        <p className="text-gray-600 mt-3 text-lg font-light">Craft Your Signature Look with AI</p>
    </header>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-6 py-3 text-sm font-medium rounded-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 ${
            active 
            ? 'bg-white text-gray-900 shadow-md' 
            : 'bg-transparent text-gray-500 hover:bg-white hover:text-gray-900'
        }`}
    >
        {children}
    </button>
);

const SparkleIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-800">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.624l-.219.932-.219-.932a2.25 2.25 0 00-1.53-1.53l-.932-.219.932-.219a2.25 2.25 0 001.53-1.53l.219-.932.219.932a2.25 2.25 0 001.53 1.53l.932.219-.932.219a2.25 2.25 0 00-1.53 1.53z" />
    </svg>
);

// A simple markdown to HTML converter for the analysis output
const formatAnalysis = (text: string): string => {
    let processedText = text
      .replace(/^## (.*$)/gim, '<h3>$1</h3>')
      .replace(/^# (.*$)/gim, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
    processedText = processedText.replace(/((?:(?:^|\n)[*-] (.*))+)/g, (match) => {
      const listItems = match.trim().split('\n').map(item => `<li>${item.substring(2)}</li>`).join('');
      return `<ul>${listItems}</ul>`;
    });
  
    return processedText.replace(/\n/g, '<br />');
};

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AppTab>('tryon');
    
    // Try-on state
    const [itemImages, setItemImages] = useState<UploadedFile[]>([]);
    const [userImage, setUserImage] = useState<UploadedFile | null>(null);
    const [sceneDescription, setSceneDescription] = useState<string>('');
    const [useThinkingMode, setUseThinkingMode] = useState<boolean>(false);
    
    // Generate state
    const [generatePrompt, setGeneratePrompt] = useState<string>('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    
    // Edit state
    const [editPrompt, setEditPrompt] = useState<string>('');

    // Shared state
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);

    const handleItemFiles = useCallback((files: File[]) => {
        const newUploadedFiles: UploadedFile[] = files.map(file => ({
            id: `${file.name}-${Date.now()}`,
            file,
            preview: URL.createObjectURL(file),
        }));
        setItemImages(prev => [...prev, ...newUploadedFiles]);
    }, []);

    const handleUserFile = useCallback((files: File[]) => {
        if (files.length > 0) {
            setUserImage({
                id: `${files[0].name}-${Date.now()}`,
                file: files[0],
                preview: URL.createObjectURL(files[0]),
            });
        }
    }, []);
    
    const removeItem = (id: string) => {
        setItemImages(prev => prev.filter(item => item.id !== id));
    };

    const handleGenerateLook = async () => {
        if (itemImages.length === 0 || !sceneDescription) {
            setError('Please upload at least one item and describe the scene.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        setAnalysisResult('');

        try {
            const imageBase64 = await generateLook(
                itemImages.map(f => f.file),
                userImage?.file ?? null,
                sceneDescription
            );
            setGeneratedImage(imageBase64);
            
            if (useThinkingMode) {
                const analysis = await analyzeLookWithThinking(imageBase64, sceneDescription);
                setAnalysisResult(analysis);
            }
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateImage = async () => {
        if (!generatePrompt) {
            setError('Please enter a prompt to generate an image.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        setAnalysisResult('');
        try {
            const imageBase64 = await generateImageFromText(generatePrompt, aspectRatio);
            setGeneratedImage(imageBase64);
        } catch(e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditImage = async () => {
        if (!generatedImage || !editPrompt) {
            setError('Please generate an image first and enter an edit prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const imageBase64 = await editImage(generatedImage, editPrompt);
            setGeneratedImage(imageBase64);
            setEditPrompt('');
        } catch(e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadImage = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${generatedImage}`;
        link.download = `stylemix-studio-${Date.now()}.jpeg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const resetTryOn = () => {
        setItemImages([]);
        setUserImage(null);
        setSceneDescription('');
        setGeneratedImage(null);
        setAnalysisResult('');
        setError(null);
        setUseThinkingMode(false);
    }
    
    const resetGenerate = () => {
        setGeneratePrompt('');
        setAspectRatio('1:1');
        setGeneratedImage(null);
        setError(null);
    }

    const renderTryOnInputs = () => (
        <div className="space-y-8">
            <section>
                <div className="flex items-center space-x-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white font-bold">1</span>
                    <h2 className="text-xl font-semibold text-gray-900">Upload Your Items</h2>
                </div>
                <FileUpload 
                    onFilesChange={handleItemFiles} 
                    multiple 
                    label="Upload images of your items: a dress, shoes, a handbag..."
                />
                {itemImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-4 sm:grid-cols-5 gap-3">
                        {itemImages.map(item => (
                            <div key={item.id} className="relative group aspect-square">
                                <img src={item.preview} alt="item preview" className="w-full h-full object-cover rounded-lg" />
                                <button onClick={() => removeItem(item.id)} className="absolute -top-1 -right-1 bg-black bg-opacity-70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100">&times;</button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
            <section>
                 <div className="flex items-center space-x-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white font-bold">2</span>
                    <h2 className="text-xl font-semibold text-gray-900">Upload Your Photo <span className="text-gray-400 font-light">(Optional)</span></h2>
                </div>
                <FileUpload 
                    onFilesChange={handleUserFile} 
                    label="Want to try it on yourself? Upload a full-body photo." 
                    note="If you skip this, we will generate a realistic AI model for you."
                />
                {userImage && (
                    <div className="mt-4">
                        <img src={userImage.preview} alt="user preview" className="w-24 h-24 object-cover rounded-lg" />
                    </div>
                )}
            </section>
            <section>
                 <div className="flex items-center space-x-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white font-bold">3</span>
                    <h2 className="text-xl font-semibold text-gray-900">Describe the Scene</h2>
                </div>
                <textarea
                    value={sceneDescription}
                    onChange={e => setSceneDescription(e.target.value)}
                    placeholder="e.g., 'walking in a park at sunset,' 'coffee shop on a rainy day,' 'rooftop party at night'."
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black transition-shadow bg-gray-50"
                />
            </section>
            <section>
                 <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-100">
                    <input type="checkbox" checked={useThinkingMode} onChange={(e) => setUseThinkingMode(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-black focus:ring-black" />
                    <span className="text-sm text-gray-700">Enable Pro Fashion Analysis</span>
                </label>
            </section>
            <div className="pt-4 space-y-3">
                <button 
                    onClick={handleGenerateLook} 
                    className="w-full bg-[#111111] text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors transform hover:scale-[1.02]"
                    disabled={isLoading}
                >
                    Generate My Look
                </button>
                {generatedImage && <button onClick={resetTryOn} className="w-full text-sm text-gray-500 hover:text-black py-2">Start Over</button>}
            </div>
        </div>
    );

    const renderGenerateInputs = () => (
        <div className="space-y-8">
             <section>
                <div className="flex items-center space-x-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white font-bold">1</span>
                    <h2 className="text-xl font-semibold text-gray-900">Describe Your Image</h2>
                </div>
                <textarea
                    value={generatePrompt}
                    onChange={e => setGeneratePrompt(e.target.value)}
                    placeholder="e.g., 'A photorealistic image of an astronaut riding a horse on Mars.'"
                    className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black transition-shadow bg-gray-50"
                />
            </section>
             <section>
                 <div className="flex items-center space-x-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white font-bold">2</span>
                    <h2 className="text-xl font-semibold text-gray-900">Choose Aspect Ratio</h2>
                </div>
                <select
                    value={aspectRatio}
                    onChange={e => setAspectRatio(e.target.value as AspectRatio)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black transition-shadow bg-white appearance-none"
                >
                    <option value="1:1">Square (1:1)</option>
                    <option value="16:9">Landscape (16:9)</option>
                    <option value="9:16">Portrait (9:16)</option>
                    <option value="4:3">Standard (4:3)</option>
                    <option value="3:4">Tall (3:4)</option>
                </select>
            </section>
            <div className="pt-4 space-y-3">
                <button 
                    onClick={handleGenerateImage} 
                    className="w-full bg-[#111111] text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors transform hover:scale-[1.02]"
                >
                    Generate Image
                </button>
                 {generatedImage && <button onClick={resetGenerate} className="w-full text-sm text-gray-500 hover:text-black py-2">Start Over</button>}
            </div>
        </div>
    );
    
    const renderEditInputs = () => (
        <div className="text-center p-8 h-full flex flex-col justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Image Editing</h3>
            <p className="mt-1 text-sm text-gray-500">
                To start editing, first create an image using the 'Virtual Try-On' or 'Image Generation' tabs. Your active image will appear in the panel on the right, along with the editing controls.
            </p>
        </div>
    );

    const renderOutputArea = () => (
        <div className="w-full">
            <div className="sticky top-8">
                 <h2 className="text-xl font-semibold text-gray-900 mb-4 lg:hidden">Your Creation</h2>
                <div className="group relative w-full aspect-square bg-black/5 rounded-2xl flex items-center justify-center border border-gray-200/50 overflow-hidden shadow-xl shadow-gray-200">
                    {isLoading && <LoadingSpinner />}
                    {!isLoading && error && (
                        <div className="text-center text-red-500 px-4">
                            <h3 className="font-semibold">Error</h3>
                            <p>{error}</p>
                        </div>
                    )}
                    {!isLoading && !error && !generatedImage && (
                        <div className="text-center text-gray-400 flex flex-col items-center justify-center p-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-500">Your masterpiece awaits</h3>
                            <p className="text-sm text-gray-400 mt-1">Results will be displayed here.</p>
                        </div>
                    )}
                    {generatedImage && (
                        <>
                            <img src={`data:image/jpeg;base64,${generatedImage}`} alt="Generated look" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center space-x-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button
                                    onClick={() => setIsZoomModalOpen(true)}
                                    className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
                                    aria-label="Zoom in"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleDownloadImage}
                                    className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
                                    aria-label="Download image"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                            </div>
                        </>
                    )}
                </div>
                {analysisResult && (
                     <div className="mt-6 p-6 rounded-2xl bg-white shadow-sm border border-gray-200/80">
                         <div className="flex items-center gap-3 mb-4">
                            <SparkleIcon />
                            <h3 className="font-semibold text-lg text-gray-900">Pro Analysis</h3>
                         </div>
                         <div
                            className="text-gray-700 font-light prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-800 prose-strong:text-gray-800 prose-ul:list-disc prose-ul:pl-5"
                            dangerouslySetInnerHTML={{ __html: formatAnalysis(analysisResult) }}
                         />
                     </div>
                )}
                {activeTab === 'edit' && generatedImage && (
                    <div className="mt-6">
                         <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Your Image</h2>
                          <textarea
                            value={editPrompt}
                            onChange={e => setEditPrompt(e.target.value)}
                            placeholder="e.g., 'make the background black and white', 'add a retro filter'"
                            className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black transition-shadow bg-gray-50"
                        />
                        <button 
                            onClick={handleEditImage} 
                            className="bg-[#111111] text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors w-full mt-2"
                            disabled={isLoading}
                        >
                            Apply Edit
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    const renderZoomModal = () => (
        isZoomModalOpen && generatedImage && (
            <div 
                className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in"
                onClick={() => setIsZoomModalOpen(false)}
            >
                <button 
                    onClick={() => setIsZoomModalOpen(false)} 
                    className="absolute top-4 right-4 bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl hover:bg-white/30 transition-colors"
                    aria-label="Close zoom"
                >&times;</button>
                <div className="relative max-w-5xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                    <img src={`data:image/jpeg;base64,${generatedImage}`} alt="Zoomed generated look" className="w-auto h-auto max-w-full max-h-[90vh] object-contain rounded-lg" />
                </div>
            </div>
        )
    );
    

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800">
            {renderZoomModal()}
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="flex justify-center mb-10">
                    <div className="flex space-x-4 p-2 bg-gray-100 rounded-xl">
                        <TabButton active={activeTab === 'tryon'} onClick={() => setActiveTab('tryon')}>Virtual Try-On</TabButton>
                        <TabButton active={activeTab === 'generate'} onClick={() => setActiveTab('generate')}>Image Generation</TabButton>
                        <TabButton active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} >Image Editing</TabButton>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200/80">
                       {activeTab === 'tryon' && renderTryOnInputs()}
                       {activeTab === 'generate' && renderGenerateInputs()}
                       {activeTab === 'edit' && renderEditInputs()}
                   </div>
                   {renderOutputArea()}
                </div>
            </main>
        </div>
    );
};

export default App;
