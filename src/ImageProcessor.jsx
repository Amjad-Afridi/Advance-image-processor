import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, RotateCw, ZoomIn, ZoomOut, Move, Scissors, FileImage, Settings, RefreshCw, Sliders, Image as ImageIcon, Layers, Palette } from 'lucide-react';

const ImageProcessor = () => {
  const [image, setImage] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [processedSize, setProcessedSize] = useState(0);
  const [quality, setQuality] = useState(0.8);
  const [format, setFormat] = useState('jpeg');
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [maxWidth, setMaxWidth] = useState(1920);
  const [maxHeight, setMaxHeight] = useState(1080);
  const [processedImage, setProcessedImage] = useState(null);
  
  // Advanced filters
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [sepia, setSepia] = useState(0);
  const [grayscale, setGrayscale] = useState(0);
  const [hueRotate, setHueRotate] = useState(0);
  const [invert, setInvert] = useState(0);
  
  // Batch processing
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('single');
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const batchInputRef = useRef(null);

  // Advanced image processing functions
  const applyFilters = (canvas, ctx) => {
    const filters = [
      `brightness(${brightness}%)`,
      `contrast(${contrast}%)`,
      `saturate(${saturation}%)`,
      `blur(${blur}px)`,
      `sepia(${sepia}%)`,
      `grayscale(${grayscale}%)`,
      `hue-rotate(${hueRotate}deg)`,
      `invert(${invert}%)`
    ].join(' ');
    
    ctx.filter = filters;
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setSepia(0);
    setGrayscale(0);
    setHueRotate(0);
    setInvert(0);
  };

  const resetCrop = () => {
    if (image) {
      setCropArea({ x: 0, y: 0, width: image.width, height: image.height });
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setOriginalSize(file.size);
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setCropArea({ x: 0, y: 0, width: img.width, height: img.height });
          setScale(1);
          setRotation(0);
          resetFilters();
          drawImageOnCanvas(img);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBatchUpload = (event) => {
    const files = Array.from(event.target.files);
    setBatchFiles(files);
  };

  const drawImageOnCanvas = (img, cropData = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const displayWidth = Math.min(600, img.width);
    const displayHeight = (img.height * displayWidth) / img.width;
    
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Apply filters
    applyFilters(canvas, ctx);
    
    // Apply transformations
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    // Reset filter for overlay
    ctx.filter = 'none';
    
    // Draw crop overlay
    if (cropData || cropArea.width > 0) {
      const crop = cropData || cropArea;
      const scaleX = canvas.width / img.width;
      const scaleY = canvas.height / img.height;
      
      // Draw overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Clear crop area
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      ctx.fillRect(
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY
      );
      
      // Draw crop border
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY
      );
      
      // Draw corner handles
      const handleSize = 8;
      ctx.fillStyle = '#00ff00';
      const corners = [
        { x: crop.x * scaleX, y: crop.y * scaleY },
        { x: (crop.x + crop.width) * scaleX, y: crop.y * scaleY },
        { x: crop.x * scaleX, y: (crop.y + crop.height) * scaleY },
        { x: (crop.x + crop.width) * scaleX, y: (crop.y + crop.height) * scaleY }
      ];
      
      corners.forEach(corner => {
        ctx.fillRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
      });
    }
  };

  const processImage = useCallback((img = image, customCrop = null, customSettings = null) => {
    if (!img) return null;
    
    const processCanvas = document.createElement('canvas');
    const ctx = processCanvas.getContext('2d');
    
    const settings = customSettings || {
      brightness, contrast, saturation, blur, sepia, grayscale, hueRotate, invert,
      quality, format, maxWidth, maxHeight, scale, rotation
    };
    
    const crop = customCrop || cropArea;
    
    // Calculate dimensions
    let { width, height } = crop.width > 0 ? crop : { width: img.width, height: img.height };
    
    // Apply max dimensions
    if (width > settings.maxWidth || height > settings.maxHeight) {
      const ratio = Math.min(settings.maxWidth / width, settings.maxHeight / height);
      width *= ratio;
      height *= ratio;
    }
    
    processCanvas.width = width;
    processCanvas.height = height;
    
    // Apply filters
    const filters = [
      `brightness(${settings.brightness}%)`,
      `contrast(${settings.contrast}%)`,
      `saturate(${settings.saturation}%)`,
      `blur(${settings.blur}px)`,
      `sepia(${settings.sepia}%)`,
      `grayscale(${settings.grayscale}%)`,
      `hue-rotate(${settings.hueRotate}deg)`,
      `invert(${settings.invert}%)`
    ].join(' ');
    
    ctx.filter = filters;
    
    // Apply transformations
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((settings.rotation * Math.PI) / 180);
    ctx.scale(settings.scale, settings.scale);
    ctx.translate(-width / 2, -height / 2);
    
    // Draw cropped image
    if (crop.width > 0) {
      ctx.drawImage(
        img,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, width, height
      );
    } else {
      ctx.drawImage(img, 0, 0, width, height);
    }
    
    ctx.restore();
    
    // Convert to desired format
    const mimeType = settings.format === 'png' ? 'image/png' : 
                    settings.format === 'webp' ? 'image/webp' : 'image/jpeg';
    const dataURL = processCanvas.toDataURL(mimeType, settings.quality);
    
    return dataURL;
  }, [image, cropArea, quality, format, maxWidth, maxHeight, scale, rotation, brightness, contrast, saturation, blur, sepia, grayscale, hueRotate, invert]);

  const processBatch = async () => {
    if (batchFiles.length === 0) return;
    
    setBatchProcessing(true);
    const results = [];
    
    for (let i = 0; i < batchFiles.length; i++) {
      const file = batchFiles[i];
      
      try {
        const img = await loadImage(file);
        const dataURL = processImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        
        results.push({
          originalName: file.name,
          processedImage: dataURL,
          originalSize: file.size,
          processedSize: Math.round((dataURL.length * 3) / 4)
        });
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
      }
    }
    
    setBatchProcessing(false);
    
    // Download all processed images
    results.forEach((result, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.download = `processed-${result.originalName.split('.')[0]}.${format}`;
        link.href = result.processedImage;
        link.click();
      }, index * 100); // Small delay between downloads
    });
  };

  const loadImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleMouseDown = (e) => {
    if (!image) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = image.width / canvas.width;
    const scaleY = image.height / canvas.height;
    
    setIsDragging(true);
    setDragStart({ x: x * scaleX, y: y * scaleY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !image) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = image.width / canvas.width;
    const scaleY = image.height / canvas.height;
    
    const currentX = x * scaleX;
    const currentY = y * scaleY;
    
    const newCropArea = {
      x: Math.min(dragStart.x, currentX),
      y: Math.min(dragStart.y, currentY),
      width: Math.abs(currentX - dragStart.x),
      height: Math.abs(currentY - dragStart.y)
    };
    
    setCropArea(newCropArea);
    drawImageOnCanvas(image, newCropArea);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const downloadImage = () => {
    if (!processedImage) return;
    
    const link = document.createElement('a');
    link.download = `processed-image.${format}`;
    link.href = processedImage;
    link.click();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    if (image) {
      drawImageOnCanvas(image);
      const processed = processImage();
      if (processed) {
        setProcessedImage(processed);
        const base64Length = processed.split(',')[1].length;
        const sizeInBytes = (base64Length * 3) / 4;
        setProcessedSize(sizeInBytes);
      }
    }
  }, [image, scale, rotation, brightness, contrast, saturation, blur, sepia, grayscale, hueRotate, invert, quality, format, maxWidth, maxHeight, cropArea, processImage]);

  const compressionRatio = originalSize && processedSize ? 
    ((originalSize - processedSize) / originalSize * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <FileImage className="text-purple-400" size={40} />
            Advanced Image Processor Pro
          </h1>
          <p className="text-gray-300 text-lg">Complete frontend image processing - No backend required!</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-1 border border-white/20">
            <button
              onClick={() => setActiveTab('single')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'single' 
                  ? 'bg-purple-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <ImageIcon className="inline mr-2" size={18} />
              Single Image
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'batch' 
                  ? 'bg-purple-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Layers className="inline mr-2" size={18} />
              Batch Processing
            </button>
          </div>
        </div>

        {activeTab === 'single' ? (
          <>
            {/* Upload Section */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
                  >
                    <Upload size={24} />
                    Upload Image
                  </button>
                </div>
                
                {originalSize > 0 && (
                  <div className="bg-white/5 rounded-xl p-4 min-w-fit">
                    <div className="text-white text-sm space-y-1">
                      <div>Original: <span className="text-red-400 font-semibold">{formatFileSize(originalSize)}</span></div>
                      <div>Processed: <span className="text-green-400 font-semibold">{formatFileSize(processedSize)}</span></div>
                      <div>Saved: <span className="text-blue-400 font-semibold">{compressionRatio}%</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {image && (
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Canvas Section */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Scissors className="text-purple-400" />
                    Crop & Transform
                  </h3>
                  
                  <div className="mb-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setScale(Math.min(3, scale + 0.1))}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn size={18} />
                    </button>
                    <button
                      onClick={() => setScale(Math.max(0.1, scale - 0.1))}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut size={18} />
                    </button>
                    <button
                      onClick={() => setRotation((rotation + 90) % 360)}
                      className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
                      title="Rotate"
                    >
                      <RotateCw size={18} />
                    </button>
                    <button
                      onClick={resetCrop}
                      className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors"
                      title="Reset Crop"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                  
                  <div className="border border-gray-600 rounded-lg overflow-hidden bg-gray-800">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      className="cursor-crosshair max-w-full h-auto"
                      style={{ display: 'block' }}
                    />
                  </div>
                  
                  <p className="text-gray-300 text-sm mt-2 flex items-center gap-2">
                    <Move size={16} />
                    Click and drag to select crop area
                  </p>
                </div>

                {/* Controls Section */}
                <div className="space-y-6">
                  {/* Image Filters */}
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Palette className="text-purple-400" />
                      Image Filters
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white mb-2">Brightness: {brightness}%</label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={brightness}
                          onChange={(e) => setBrightness(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white mb-2">Contrast: {contrast}%</label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={contrast}
                          onChange={(e) => setContrast(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white mb-2">Saturation: {saturation}%</label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={saturation}
                          onChange={(e) => setSaturation(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white mb-2">Blur: {blur}px</label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={blur}
                          onChange={(e) => setBlur(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white mb-2">Sepia: {sepia}%</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={sepia}
                          onChange={(e) => setSepia(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white mb-2">Grayscale: {grayscale}%</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={grayscale}
                          onChange={(e) => setGrayscale(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white mb-2">Hue: {hueRotate}°</label>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={hueRotate}
                          onChange={(e) => setHueRotate(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white mb-2">Invert: {invert}%</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={invert}
                          onChange={(e) => setInvert(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={resetFilters}
                      className="w-full mt-4 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      Reset Filters
                    </button>
                  </div>

                  {/* Compression Settings */}
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Settings className="text-purple-400" />
                      Export Settings
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-white mb-2">Quality: {Math.round(quality * 100)}%</label>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={quality}
                          onChange={(e) => setQuality(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white mb-2">Format</label>
                        <select
                          value={format}
                          onChange={(e) => setFormat(e.target.value)}
                          className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                        >
                          <option value="jpeg">JPEG</option>
                          <option value="png">PNG</option>
                          <option value="webp">WebP</option>
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-white mb-2">Max Width</label>
                          <input
                            type="number"
                            value={maxWidth}
                            onChange={(e) => setMaxWidth(parseInt(e.target.value))}
                            className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                          />
                        </div>
                        <div>
                          <label className="block text-white mb-2">Max Height</label>
                          <input
                            type="number"
                            value={maxHeight}
                            onChange={(e) => setMaxHeight(parseInt(e.target.value))}
                            className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview & Download */}
                  {processedImage && (
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                      <h3 className="text-xl font-semibold text-white mb-4">Preview & Download</h3>
                      
                      <div className="bg-gray-800 rounded-lg p-4 mb-4">
                        <img
                          src={processedImage}
                          alt="Processed"
                          className="max-w-full h-auto rounded border border-gray-600"
                        />
                      </div>
                      
                      <button
                        onClick={downloadImage}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
                      >
                        <Download size={24} />
                        Download Processed Image
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Batch Processing Tab */
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
              <Layers className="text-purple-400" />
              Batch Image Processing
            </h3>
            
            <div className="space-y-6">
              <div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleBatchUpload}
                  ref={batchInputRef}
                  className="hidden"
                />
                <button
                  onClick={() => batchInputRef.current?.click()}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
                >
                  <Upload size={24} />
                  Select Multiple Images
                </button>
              </div>
              
              {batchFiles.length > 0 && (
                <div>
                  <h4 className="text-white font-semibold mb-3">Selected Files ({batchFiles.length}):</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                    {batchFiles.map((file, index) => (
                      <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="text-white text-sm font-medium truncate">{file.name}</div>
                        <div className="text-gray-400 text-xs">{formatFileSize(file.size)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Batch Settings */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-white font-semibold">Batch Settings</h4>
                  
                  <div>
                    <label className="block text-white mb-2">Quality: {Math.round(quality * 100)}%</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white mb-2">Format</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                    >
                      <option value="jpeg">JPEG</option>
                      <option value="png">PNG</option>
                      <option value="webp">WebP</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-white font-semibold">Dimensions</h4>
                  
                  <div>
                    <label className="block text-white mb-2">Max Width</label>
                    <input
                      type="number"
                      value={maxWidth}
                      onChange={(e) => setMaxWidth(parseInt(e.target.value))}
                      className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white mb-2">Max Height</label>
                    <input
                      type="number"
                      value={maxHeight}
                      onChange={(e) => setMaxHeight(parseInt(e.target.value))}
                      className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                    />
                  </div>
                </div>
              </div>
              
              {/* Batch Filters */}
              <div>
                <h4 className="text-white font-semibold mb-4">Batch Filters</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-white mb-2 text-sm">Brightness: {brightness}%</label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white mb-2 text-sm">Contrast: {contrast}%</label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={contrast}
                      onChange={(e) => setContrast(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white mb-2 text-sm">Saturation: {saturation}%</label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={saturation}
                      onChange={(e) => setSaturation(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white mb-2 text-sm">Blur: {blur}px</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={blur}
                      onChange={(e) => setBlur(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
                
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={resetFilters}
                    className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
              
              {/* Process Button */}
              {batchFiles.length > 0 && (
                <div className="text-center">
                  <button
                    onClick={processBatch}
                    disabled={batchProcessing}
                    className={`bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg mx-auto ${
                      batchProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {batchProcessing ? (
                      <>
                        <RefreshCw className="animate-spin" size={24} />
                        Processing Images...
                      </>
                    ) : (
                      <>
                        <Download size={24} />
                        Process & Download All ({batchFiles.length} images)
                      </>
                    )}
                  </button>
                  
                  {batchProcessing && (
                    <p className="text-gray-300 mt-4">
                      Processing images... Downloads will start automatically when complete.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="text-center mt-12 text-gray-400">
          <p className="text-sm">
            🚀 Advanced Image Processor Pro - Built with React & Canvas API
          </p>
          <p className="text-xs mt-2">
            Features: Crop, Resize, Filters, Format Conversion, Batch Processing & More!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageProcessor;