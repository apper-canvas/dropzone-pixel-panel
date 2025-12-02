import React, { useEffect, useRef, useState, useMemo } from 'react';

const ApperFileFieldComponent = ({ config, elementId }) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  
  const mountedRef = useRef(false);
  const elementIdRef = useRef(elementId);
  const existingFilesRef = useRef([]);

  // Update elementId ref when it changes
  useEffect(() => {
    elementIdRef.current = elementId;
  }, [elementId]);

  // Memoize existingFiles to detect actual changes
  const memoizedExistingFiles = useMemo(() => {
    const files = config?.existingFiles || [];
    if (files.length === 0) return [];
    
    // Check if format conversion is needed
    const needsConversion = files.length > 0 && files[0].Id !== undefined;
    
    if (needsConversion) {
      try {
        return window.ApperSDK?.ApperFileUploader?.toUIFormat?.(files) || files;
      } catch (error) {
        console.error('Error converting file format:', error);
        return files;
      }
    }
    
    return files;
  }, [config?.existingFiles?.length, config?.existingFiles?.[0]?.id || config?.existingFiles?.[0]?.Id]);

  // Initial mount effect
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Wait for ApperSDK to load
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!window.ApperSDK && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!window.ApperSDK) {
          throw new Error('ApperSDK not loaded after 5 seconds');
        }

        const { ApperFileUploader } = window.ApperSDK;
        elementIdRef.current = elementId;
        
        await ApperFileUploader.FileField.mount(elementIdRef.current, {
          ...config,
          existingFiles: memoizedExistingFiles
        });
        
        mountedRef.current = true;
        setIsReady(true);
        setError(null);
        
      } catch (error) {
        console.error('Error initializing ApperFileFieldComponent:', error);
        setError(error.message);
        setIsReady(false);
      }
    };

    if (!mountedRef.current) {
      initializeSDK();
    }

    return () => {
      try {
        if (mountedRef.current && window.ApperSDK?.ApperFileUploader) {
          window.ApperSDK.ApperFileUploader.FileField.unmount(elementIdRef.current);
        }
      } catch (error) {
        console.error('Error unmounting file field:', error);
      }
      mountedRef.current = false;
      setIsReady(false);
    };
  }, [elementId, config.fieldKey, config.tableName, config.apperProjectId, config.apperPublicKey]);

  // File update effect
  useEffect(() => {
    if (!isReady || !window.ApperSDK?.ApperFileUploader || !config.fieldKey) {
      return;
    }

    // Deep equality check to avoid unnecessary updates
    const currentFilesString = JSON.stringify(existingFilesRef.current);
    const newFilesString = JSON.stringify(memoizedExistingFiles);
    
    if (currentFilesString === newFilesString) {
      return;
    }

    try {
      if (memoizedExistingFiles.length > 0) {
        window.ApperSDK.ApperFileUploader.FileField.updateFiles(config.fieldKey, memoizedExistingFiles);
      } else {
        window.ApperSDK.ApperFileUploader.FileField.clearField(config.fieldKey);
      }
      
      existingFilesRef.current = [...memoizedExistingFiles];
    } catch (error) {
      console.error('Error updating files:', error);
      setError(error.message);
    }
  }, [memoizedExistingFiles, isReady, config.fieldKey]);

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <p className="text-red-600 text-sm">Error loading file uploader: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div id={elementIdRef.current} className="file-uploader-container">
        {!isReady && (
          <div className="flex items-center justify-center p-4 border border-gray-300 rounded-md bg-gray-50">
            <div className="text-sm text-gray-600">Loading file uploader...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApperFileFieldComponent;