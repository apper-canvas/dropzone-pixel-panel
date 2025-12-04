import React, { useCallback, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { uploadFileService } from "@/services/api/uploadService";
import { cn } from "@/utils/cn";
import ApperIcon from "@/components/ApperIcon";
import DropZone from "@/components/molecules/DropZone";
import UploadQueue from "@/components/molecules/UploadQueue";
import Button from "@/components/atoms/Button";
import ApperFileFieldComponent from "@/components/atoms/FileUploader";

const FileUploader = ({ className = "" }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [sessions, setSessions] = useState([]);

  // Load existing sessions on component mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const sessionsData = await uploadFileService.getAllSessions();
      setSessions(sessionsData);
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  };

  const handleFileAdded = useCallback((newFile) => {
    setFile(newFile);
    toast.success("File added to upload queue", {
      position: "top-right",
      autoClose: 2000
    });
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
  }, []);

  const handleRetryFile = useCallback(async () => {
    if (!file) return;

    // Reset file status
    setFile(prev => ({
      ...prev,
      status: "uploading",
      progress: 0,
      error: null
    }));

    try {
      await uploadSingleFile(file);
    } catch (error) {
      console.error("Retry upload failed:", error);
    }
  }, [file]);

  const uploadSingleFile = useCallback(async (fileToUpload) => {
    return new Promise((resolve, reject) => {
      // Simulate upload progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(progressInterval);
          
          // Update file status to completed
          setFile(prev => ({
            ...prev,
            status: "completed",
            progress: 100,
            uploadedAt: new Date().toISOString()
          }));
          
          resolve();
        } else {
          // Update progress
          setFile(prev => ({
            ...prev,
            progress: Math.round(progress)
          }));
        }
      }, 200);

      // Simulate potential errors (10% chance)
      setTimeout(() => {
        if (Math.random() < 0.1 && progress < 100) {
          clearInterval(progressInterval);
          setFile(prev => ({
            ...prev,
            status: "error",
            error: "Upload failed. Please try again."
          }));
          reject(new Error("Upload failed"));
        }
      }, Math.random() * 2000 + 1000);
    });
  }, []);

  // Get files from ApperFileFieldComponent
  const getFiles = async (fieldKey) => {
    try {
      if (!window.ApperSDK?.ApperFileUploader) {
        throw new Error('ApperFileUploader not available');
      }
      
      return await window.ApperSDK.ApperFileUploader.FileField.getFiles(fieldKey);
    } catch (error) {
      console.error('Error getting files:', error);
      return uploadedFiles; // Fallback to current state
    }
  };

  const handleUploadFile = useCallback(async () => {
    if (!file || (file.status !== "pending" && file.status !== "error")) {
      toast.warning("No file to upload");
      return;
    }

    setIsUploading(true);

    // Update file to uploading status
    setFile(prev => ({
      ...prev,
      status: "uploading",
      progress: 0,
      error: null
    }));

    try {
      // Get files from ApperFileFieldComponent
      const files = await getFiles('file_content_c');
      console.log("files:",files)
      // Create upload session with files
      const sessionData = {
        Name: `Upload Session ${new Date().toLocaleDateString()}`,
        Tags: "file-upload",
        files: files || [file],
        totalSize: file.size,
        completedCount: 0,
        startedAt: new Date().toISOString()
      };
      console.log("sessionData:", sessionData)
      const session = await uploadFileService.createSession(sessionData);
      
      if (session) {
        await uploadSingleFile(file);
        
        // Update session as completed
        await uploadFileService.updateSession(session.Id, {
          completedCount: 1,
          completedAt: new Date().toISOString()
        });

        // Reload sessions
        await loadSessions();
        
        toast.success("File uploaded successfully!", {
          position: "top-right",
          autoClose: 3000
        });
      } else {
        throw new Error("Failed to create upload session");
      }
    } catch (error) {
      console.error('apper_info: Got this error in file upload:', error.message);
      toast.error("Upload failed. Please try again.", {
        position: "top-right",
        autoClose: 3000
      });
      
      setFile(prev => ({
        ...prev,
        status: "error",
        error: "Upload failed. Please try again."
      }));
    } finally {
      setIsUploading(false);
    }
  }, [file, uploadSingleFile]);

  const handleClearCompleted = useCallback(() => {
    if (!file || file.status !== "completed") {
      toast.info("No completed file to clear");
      return;
    }

    setFile(null);
    toast.success("Cleared completed file", {
      position: "top-right",
      autoClose: 2000
    });
  }, [file]);

  const handleClearAll = useCallback(() => {
    if (!file) {
      toast.info("No file to clear");
      return;
    }

    setFile(null);
    toast.success("Cleared file from queue", {
      position: "top-right",
      autoClose: 2000
    });
  }, [file]);

  // Handle file upload form submission
  const handleFileSubmit = async (formData) => {
    try {
      // Get files using SDK method
      const files = await getFiles('file_content_c');
      
      // Create session with files
      const sessionData = {
        ...formData,
        files: files || uploadedFiles
      };
      
      const session = await uploadFileService.createSession(sessionData);
      
      if (session) {
        toast.success("Files uploaded successfully!");
        await loadSessions();
        setUploadedFiles([]);
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error("Failed to upload files");
    }
  };

  const isPending = file && (file.status === "pending" || file.status === "error");
  const isCompleted = file && file.status === "completed";
  const isFileUploading = file && file.status === "uploading";
  
  return (
    <div className={cn("space-y-8", className)}>
      {/* ApperFileFieldComponent for database file uploads */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ApperIcon name="CloudUpload" className="w-5 h-5 mr-2 text-blue-600" />
          Upload Files to Database
        </h3>
        <ApperFileFieldComponent
          elementId="file_content_c"
          config={{
            fieldName: 'file_content_c',
            fieldKey: 'file_content_c',
            tableName: 'upload_session_c',
            apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
            apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY,
            existingFiles: uploadedFiles,
            fileCount: uploadedFiles.length
          }}
        />
        <div className="mt-4">
          <Button
            onClick={() => handleFileSubmit({
              Name: `Upload Session ${new Date().toLocaleDateString()}`,
              Tags: "database-upload"
            })}
            className="w-full"
          >
            <ApperIcon name="Save" className="w-4 h-4 mr-2" />
            Save to Database
          </Button>
        </div>
      </div>

      {/* Original Drop Zone for demo purposes */}
      <DropZone
        onFileAdded={handleFileAdded}
        multiple={false}
        maxSize={100 * 1024 * 1024} // 100MB
        disabled={isUploading || !!file}
      />
      
      {/* Upload Queue */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <UploadQueue
              file={file}
              onRemoveFile={handleRemoveFile}
              onRetryFile={handleRetryFile}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 p-6 bg-white rounded-lg border border-gray-200 shadow-sm"
          >
            {isPending && (
              <Button
                onClick={handleUploadFile}
                disabled={isUploading}
                size="lg"
                className="flex-1 sm:flex-none"
              >
                {isUploading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <ApperIcon name="Upload" className="w-5 h-5 mr-2" />
                    </motion.div>
                    Uploading File...
                  </>
                ) : (
                  <>
                    <ApperIcon name="Upload" className="w-5 h-5 mr-2" />
                    Upload File
                  </>
                )}
              </Button>
            )}

            <div className="flex items-center space-x-2">
              {isCompleted && (
                <Button
                  onClick={handleClearCompleted}
                  variant="secondary"
                  size="md"
                  disabled={isUploading}
                >
                  <ApperIcon name="CheckCircle" className="w-4 h-4 mr-2" />
                  Clear Completed
                </Button>
              )}

              <Button
                onClick={handleClearAll}
                variant="ghost"
                size="md"
                disabled={isUploading}
                className="text-gray-600 hover:text-red-600 hover:bg-red-50"
              >
                <ApperIcon name="Trash2" className="w-4 h-4 mr-2" />
                Clear File
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sessions List */}
      {sessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ApperIcon name="FileStack" className="w-5 h-5 mr-2 text-green-600" />
            Recent Upload Sessions
          </h3>
          <div className="space-y-3">
            {sessions.slice(0, 5).map((session) => (
              <div
                key={session.Id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div>
                  <div className="font-medium text-gray-900">{session.Name}</div>
                  <div className="text-sm text-gray-500">
                    {session.Tags && `Tags: ${session.Tags}`}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Files: {session.file_content_c?.length || 0}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default FileUploader;