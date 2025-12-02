import { getApperClient } from "@/services/apperClient";
import { toast } from "react-toastify";

// Field name mapping from mock data to database schema
const FIELD_MAPPING = {
  id: 'Id',
  files: 'file_content_c',
  totalSize: 'total_size_c',
  completedCount: 'completed_count_c',
  startedAt: 'started_at_c',
  completedAt: 'completed_at_c',
  Name: 'Name',
  Tags: 'Tags'
};

export const uploadFileService = {
  // Get all upload sessions
  async getAllSessions() {
    try {
      const apperClient = getApperClient();
      if (!apperClient) {
        throw new Error("ApperClient not initialized");
      }

      const response = await apperClient.fetchRecords('upload_session_c', {
        fields: [
          {"field": {"Name": "Name"}},
          {"field": {"Name": "Tags"}},
          {"field": {"Name": "file_content_c"}},
          {"field": {"Name": "total_size_c"}},
          {"field": {"Name": "completed_count_c"}},
          {"field": {"Name": "started_at_c"}},
          {"field": {"Name": "completed_at_c"}}
        ],
        orderBy: [{"fieldName": "Id", "sorttype": "DESC"}],
        pagingInfo: {"limit": 50, "offset": 0}
      });

      if (!response.success) {
        console.error(response.message);
        toast.error(response.message);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error("Error fetching upload sessions:", error?.response?.data?.message || error);
      toast.error("Failed to load upload sessions");
      return [];
    }
  },

  // Get session by ID
  async getSessionById(sessionId) {
    try {
      const apperClient = getApperClient();
      if (!apperClient) {
        throw new Error("ApperClient not initialized");
      }

      const response = await apperClient.getRecordById('upload_session_c', parseInt(sessionId), {
        fields: [
          {"field": {"Name": "Name"}},
          {"field": {"Name": "Tags"}},
          {"field": {"Name": "file_content_c"}},
          {"field": {"Name": "total_size_c"}},
          {"field": {"Name": "completed_count_c"}},
          {"field": {"Name": "started_at_c"}},
          {"field": {"Name": "completed_at_c"}}
        ]
      });

      if (!response?.data) {
        throw new Error(`Upload session with ID ${sessionId} not found`);
      }

      return response.data;
    } catch (error) {
      console.error(`Error fetching session ${sessionId}:`, error?.response?.data?.message || error);
      throw error;
    }
  },

  // Create new upload session
  async createSession(sessionData) {
    try {
      const apperClient = getApperClient();
      if (!apperClient) {
        throw new Error("ApperClient not initialized");
      }

      // Convert files to proper format if they exist
      let fileContent = [];
      if (sessionData.files && sessionData.files.length > 0) {
        fileContent = window.ApperSDK?.ApperFileUploader?.toCreateFormat?.(sessionData.files) || sessionData.files;
      }

      const params = {
        records: [{
          Name: sessionData.Name || `Upload Session ${new Date().toISOString()}`,
          Tags: sessionData.Tags || "",
          file_content_c: fileContent,
          total_size_c: sessionData.totalSize || 0,
          completed_count_c: sessionData.completedCount || 0,
          started_at_c: sessionData.startedAt || new Date().toISOString(),
          completed_at_c: sessionData.completedAt || null
        }]
      };

      const response = await apperClient.createRecord('upload_session_c', params);

      if (!response.success) {
        console.error(response.message);
        toast.error(response.message);
        return null;
      }

      if (response.results) {
        const successful = response.results.filter(r => r.success);
        const failed = response.results.filter(r => !r.success);
        
        if (failed.length > 0) {
          console.error(`Failed to create ${failed.length} records:`, failed);
          failed.forEach(record => {
            record.errors?.forEach(error => toast.error(`${error.fieldLabel}: ${error}`));
            if (record.message) toast.error(record.message);
          });
        }
        
        return successful.length > 0 ? successful[0].data : null;
      }

      return null;
    } catch (error) {
      console.error("Error creating upload session:", error?.response?.data?.message || error);
      toast.error("Failed to create upload session");
      return null;
    }
  },

  // Update upload session
  async updateSession(sessionId, updateData) {
    try {
      const apperClient = getApperClient();
      if (!apperClient) {
        throw new Error("ApperClient not initialized");
      }

      // Convert files to proper format if they exist
      let fileContent = updateData.files;
      if (updateData.files && Array.isArray(updateData.files)) {
        fileContent = window.ApperSDK?.ApperFileUploader?.toCreateFormat?.(updateData.files) || updateData.files;
      }

      const params = {
        records: [{
          Id: parseInt(sessionId),
          ...(updateData.Name && { Name: updateData.Name }),
          ...(updateData.Tags !== undefined && { Tags: updateData.Tags }),
          ...(fileContent !== undefined && { file_content_c: fileContent }),
          ...(updateData.totalSize !== undefined && { total_size_c: updateData.totalSize }),
          ...(updateData.completedCount !== undefined && { completed_count_c: updateData.completedCount }),
          ...(updateData.startedAt && { started_at_c: updateData.startedAt }),
          ...(updateData.completedAt !== undefined && { completed_at_c: updateData.completedAt })
        }]
      };

      const response = await apperClient.updateRecord('upload_session_c', params);

      if (!response.success) {
        console.error(response.message);
        toast.error(response.message);
        return null;
      }

      if (response.results) {
        const successful = response.results.filter(r => r.success);
        const failed = response.results.filter(r => !r.success);
        
        if (failed.length > 0) {
          console.error(`Failed to update ${failed.length} records:`, failed);
          failed.forEach(record => {
            record.errors?.forEach(error => toast.error(`${error.fieldLabel}: ${error}`));
            if (record.message) toast.error(record.message);
          });
        }
        
        return successful.length > 0 ? successful[0].data : null;
      }

      return null;
    } catch (error) {
      console.error("Error updating upload session:", error?.response?.data?.message || error);
      toast.error("Failed to update upload session");
      return null;
    }
  },

  // Delete upload session
  async deleteSession(sessionId) {
    try {
      const apperClient = getApperClient();
      if (!apperClient) {
        throw new Error("ApperClient not initialized");
      }

      const params = { 
        RecordIds: [parseInt(sessionId)]
      };

      const response = await apperClient.deleteRecord('upload_session_c', params);

      if (!response.success) {
        console.error(response.message);
        toast.error(response.message);
        return false;
      }

      if (response.results) {
        const successful = response.results.filter(r => r.success);
        const failed = response.results.filter(r => !r.success);
        
        if (failed.length > 0) {
          console.error(`Failed to delete ${failed.length} records:`, failed);
          failed.forEach(record => {
            if (record.message) toast.error(record.message);
          });
        }
        
        return successful.length > 0;
      }

      return false;
    } catch (error) {
      console.error("Error deleting upload session:", error?.response?.data?.message || error);
      toast.error("Failed to delete upload session");
      return false;
    }
  },

  // Validate file before upload
  async validateFile(file, maxSize = 100 * 1024 * 1024) {
    // Client-side validation (no database call needed)
    const errors = [];
    
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
    }
    
    if (file.name.length > 255) {
      errors.push("File name is too long (max 255 characters)");
    }
    
    // Check for dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (dangerousExtensions.includes(fileExtension)) {
      errors.push("File type not allowed for security reasons");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Upload file method for compatibility with existing UI
  async uploadFile(file, onProgress) {
    // This method is kept for UI compatibility
    // The actual file upload is handled by ApperFileFieldComponent
    return new Promise((resolve, reject) => {
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        
        if (progress >= 100) {
          progress = 100;
          clearInterval(progressInterval);
          
          const uploadResult = {
            id: Date.now().toString(),
            name: file.name,
            size: file.size,
            type: file.type,
            status: "completed",
            progress: 100,
            uploadedAt: new Date().toISOString(),
            url: `https://example.com/files/${file.name}`,
            error: null
          };
          
          resolve(uploadResult);
        } else {
          if (onProgress) {
            onProgress(Math.round(progress));
          }
        }
      }, 200);

      // Simulate potential upload failures (5% chance)
      setTimeout(() => {
        if (Math.random() < 0.05 && progress < 100) {
          clearInterval(progressInterval);
          reject(new Error("Upload failed due to network error"));
        }
      }, Math.random() * 3000 + 1000);
    });
  }
};