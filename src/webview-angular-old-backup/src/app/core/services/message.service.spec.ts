import { TestBed } from '@angular/core/testing';
import { MessageService, MessageType, WebviewMessage } from './message.service';
import { VSCodeApiService } from './vscode-api.service';
import { ErrorHandlerService } from './error-handler.service';

describe('MessageService', () => {
  let service: MessageService;
  let mockVSCodeApiService: jasmine.SpyObj<VSCodeApiService>;
  let mockErrorHandlerService: jasmine.SpyObj<ErrorHandlerService>;

  const createMockMessage = <T>(type: MessageType, payload: T): WebviewMessage<T> => ({
    type,
    payload,
    timestamp: new Date().toISOString(),
    requestId: 'test-request-id'
  });

  beforeEach(() => {
    const vscodeApiSpy = jasmine.createSpyObj('VSCodeApiService', [
      'postMessage', 
      'sendRequest', 
      'onMessage'
    ]);
    const errorHandlerSpy = jasmine.createSpyObj('ErrorHandlerService', [
      'handleError', 
      'handleApiError', 
      'retryOperation'
    ]);

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        { provide: VSCodeApiService, useValue: vscodeApiSpy },
        { provide: ErrorHandlerService, useValue: errorHandlerSpy }
      ]
    });

    service = TestBed.inject(MessageService);
    mockVSCodeApiService = TestBed.inject(VSCodeApiService) as jasmine.SpyObj<VSCodeApiService>;
    mockErrorHandlerService = TestBed.inject(ErrorHandlerService) as jasmine.SpyObj<ErrorHandlerService>;

    // Mock error handler retry operation by default to return the operation result
    mockErrorHandlerService.retryOperation.and.callFake(async (operation) => operation());
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have initial state with no errors and not loading', () => {
      expect(service.lastError()).toBeNull();
      expect(service.isLoading()).toBeFalse();
      expect(service.retryCount()).toBe(0);
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', () => {
      const payload = { config: 'test' };
      
      service.sendMessage(MessageType.LOAD_CONFIG, payload);
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.LOAD_CONFIG,
          payload,
          timestamp: jasmine.any(String),
          requestId: jasmine.any(String)
        })
      );
      expect(service.lastError()).toBeNull();
    });

    it('should send message without payload', () => {
      service.sendMessage(MessageType.LOAD_CONFIG);
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.LOAD_CONFIG,
          payload: undefined
        })
      );
    });

    it('should handle errors when sending message', () => {
      const error = new Error('Send failed');
      mockVSCodeApiService.postMessage.and.throwError(error);
      
      service.sendMessage(MessageType.LOAD_CONFIG, { test: 'data' });
      
      expect(service.lastError()).toBe('Send failed');
      expect(mockErrorHandlerService.handleError).toHaveBeenCalledWith(
        error,
        'Send loadConfig message',
        'medium'
      );
    });

    it('should generate unique request IDs', () => {
      service.sendMessage(MessageType.LOAD_CONFIG);
      service.sendMessage(MessageType.LOAD_CONFIG);
      
      const calls = mockVSCodeApiService.postMessage.calls.all();
      expect(calls[0].args[0].requestId).not.toBe(calls[1].args[0].requestId);
    });
  });

  describe('configuration methods', () => {
    it('should load configuration', async () => {
      const expectedResponse = { organization: 'test', project: 'test' };
      mockVSCodeApiService.sendRequest.and.returnValue(Promise.resolve(expectedResponse));
      
      const result = await service.loadConfiguration();
      
      expect(result).toEqual(expectedResponse);
      expect(mockVSCodeApiService.sendRequest).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.LOAD_CONFIG
        }),
        5000 // Expected timeout
      );
    });

    it('should save configuration', async () => {
      const config = { organization: 'test', project: 'test' };
      mockVSCodeApiService.sendRequest.and.returnValue(Promise.resolve());
      
      await service.saveConfiguration(config);
      
      expect(mockVSCodeApiService.sendRequest).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.SAVE_CONFIG,
          payload: { config }
        }),
        10000
      );
    });

    it('should test connection', async () => {
      const config = { organization: 'test', project: 'test' };
      const expectedResponse = { success: true };
      mockVSCodeApiService.sendRequest.and.returnValue(Promise.resolve(expectedResponse));
      
      const result = await service.testConnection(config);
      
      expect(result).toEqual(expectedResponse);
      expect(mockVSCodeApiService.sendRequest).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.TEST_CONNECTION,
          payload: { config }
        }),
        30000
      );
    });
  });

  describe('pull request methods', () => {
    it('should load pull requests', async () => {
      const expectedPRs = [{ id: 1, title: 'Test PR' }];
      mockVSCodeApiService.sendRequest.and.returnValue(Promise.resolve(expectedPRs));
      
      const result = await service.loadPullRequests();
      
      expect(result).toEqual(expectedPRs);
      expect(mockVSCodeApiService.sendRequest).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.LOAD_PULL_REQUESTS
        }),
        30000
      );
    });

    it('should select pull request', async () => {
      const prId = 123;
      const expectedResponse = { id: prId, selected: true };
      mockVSCodeApiService.sendRequest.and.returnValue(Promise.resolve(expectedResponse));
      
      const result = await service.selectPullRequest(prId);
      
      expect(result).toEqual(expectedResponse);
      expect(mockVSCodeApiService.sendRequest).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.SELECT_PULL_REQUEST,
          payload: { prId }
        }),
        10000
      );
    });

    it('should load PR details', async () => {
      const prId = 123;
      const expectedDetails = { id: prId, files: [], comments: [] };
      mockVSCodeApiService.sendRequest.and.returnValue(Promise.resolve(expectedDetails));
      
      const result = await service.loadPRDetails(prId);
      
      expect(result).toEqual(expectedDetails);
      expect(mockVSCodeApiService.sendRequest).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.LOAD_PR_DETAILS,
          payload: { prId }
        }),
        15000
      );
    });
  });

  describe('AI analysis methods', () => {
    it('should start AI analysis', () => {
      const prId = 123;
      
      service.startAIAnalysis(prId);
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.START_AI_ANALYSIS,
          payload: { prId }
        })
      );
    });

    it('should cancel AI analysis', () => {
      const prId = 123;
      
      service.cancelAIAnalysis(prId);
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.AI_ANALYSIS_CANCEL,
          payload: { prId }
        })
      );
    });
  });

  describe('comment management methods', () => {
    it('should approve comment', () => {
      const commentId = 'comment-123';
      
      service.approveComment(commentId);
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.APPROVE_COMMENT,
          payload: { commentId }
        })
      );
    });

    it('should dismiss comment', () => {
      const commentId = 'comment-123';
      
      service.dismissComment(commentId);
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.DISMISS_COMMENT,
          payload: { commentId }
        })
      );
    });

    it('should modify comment', () => {
      const commentId = 'comment-123';
      const content = 'Updated comment content';
      
      service.modifyComment(commentId, content);
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.MODIFY_COMMENT,
          payload: { commentId, content }
        })
      );
    });

    it('should export comments', () => {
      service.exportComments();
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.EXPORT_COMMENTS
        })
      );
    });
  });

  describe('notification methods', () => {
    it('should show error notification', () => {
      const message = 'Error message';
      const details = 'Error details';
      
      service.showError(message, details);
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.SHOW_ERROR,
          payload: { message, details }
        })
      );
    });

    it('should show success notification', () => {
      const message = 'Success message';
      
      service.showSuccess(message);
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.SHOW_SUCCESS,
          payload: { message }
        })
      );
    });

    it('should show warning notification', () => {
      const message = 'Warning message';
      
      service.showWarning(message);
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.SHOW_WARNING,
          payload: { message }
        })
      );
    });

    it('should show info notification', () => {
      const message = 'Info message';
      
      service.showInfo(message);
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.SHOW_INFO,
          payload: { message }
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle request errors and set loading state', async () => {
      const error = new Error('Request failed');
      mockErrorHandlerService.retryOperation.and.returnValue(Promise.reject(error));
      
      try {
        await service.loadConfiguration();
        fail('Expected promise to reject');
      } catch (e) {
        expect(e).toBe(error);
      }
      
      expect(service.lastError()).toBe('Request failed');
      expect(service.isLoading()).toBeFalse();
      expect(mockErrorHandlerService.handleApiError).toHaveBeenCalledWith(
        error,
        'loadConfig request',
        jasmine.any(Function)
      );
    });

    it('should handle timeout errors with specific context', async () => {
      const timeoutError = new Error('Request timeout after 5000ms');
      mockErrorHandlerService.retryOperation.and.returnValue(Promise.reject(timeoutError));
      
      try {
        await service.loadConfiguration();
        fail('Expected promise to reject');
      } catch (e) {
        expect(e).toBe(timeoutError);
      }
      
      expect(mockErrorHandlerService.handleApiError).toHaveBeenCalledWith(
        timeoutError,
        'loadConfig request (timeout after 5000ms)',
        jasmine.any(Function)
      );
    });

    it('should handle network errors with specific context', async () => {
      const networkError = new Error('Network connection failed');
      mockErrorHandlerService.retryOperation.and.returnValue(Promise.reject(networkError));
      
      try {
        await service.loadConfiguration();
        fail('Expected promise to reject');
      } catch (e) {
        expect(e).toBe(networkError);
      }
      
      expect(mockErrorHandlerService.handleApiError).toHaveBeenCalledWith(
        networkError,
        'loadConfig request (network error)',
        jasmine.any(Function)
      );
    });

    it('should clear errors', () => {
      // First set an error
      const error = new Error('Test error');
      mockVSCodeApiService.postMessage.and.throwError(error);
      service.sendMessage(MessageType.LOAD_CONFIG);
      expect(service.lastError()).toBe('Test error');
      
      // Then clear it
      service.clearError();
      expect(service.lastError()).toBeNull();
    });
  });

  describe('loading state management', () => {
    it('should set loading state during requests', async () => {
      let loadingStateDuringRequest: boolean;
      
      mockErrorHandlerService.retryOperation.and.callFake(async (operation) => {
        loadingStateDuringRequest = service.isLoading();
        return operation();
      });
      
      mockVSCodeApiService.sendRequest.and.returnValue(Promise.resolve({}));
      
      await service.loadConfiguration();
      
      expect(loadingStateDuringRequest!).toBe(true);
      expect(service.isLoading()).toBeFalse();
    });

    it('should reset loading state after successful request', async () => {
      mockVSCodeApiService.sendRequest.and.returnValue(Promise.resolve({}));
      
      await service.loadConfiguration();
      
      expect(service.isLoading()).toBeFalse();
    });

    it('should reset loading state after failed request', async () => {
      const error = new Error('Request failed');
      mockErrorHandlerService.retryOperation.and.returnValue(Promise.reject(error));
      
      try {
        await service.loadConfiguration();
      } catch (e) {
        // Expected to throw
      }
      
      expect(service.isLoading()).toBeFalse();
    });
  });

  describe('onMessage observables', () => {
    it('should create observable for all messages', () => {
      const messageObs = service.onMessage();
      expect(messageObs).toBeDefined();
    });

    it('should create observable for specific message type', () => {
      const messageObs = service.onMessageOfType(MessageType.LOAD_CONFIG);
      expect(messageObs).toBeDefined();
    });
  });

  describe('settings methods', () => {
    it('should open settings', async () => {
      mockVSCodeApiService.sendRequest.and.returnValue(Promise.resolve());
      
      await service.openSettings();
      
      expect(mockVSCodeApiService.sendRequest).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.OPEN_SETTINGS
        }),
        10000
      );
    });

    it('should close settings', () => {
      service.closeSettings();
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.CLOSE_SETTINGS
        })
      );
    });

    it('should validate setting', async () => {
      const key = 'organization';
      const value = 'test-org';
      const expectedResponse = { valid: true };
      mockVSCodeApiService.sendRequest.and.returnValue(Promise.resolve(expectedResponse));
      
      const result = await service.validateSetting(key, value);
      
      expect(result).toEqual(expectedResponse);
      expect(mockVSCodeApiService.sendRequest).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.VALIDATE_SETTING,
          payload: { key, value }
        }),
        10000
      );
    });

    it('should save settings', async () => {
      const settings = { organization: 'test', project: 'test' };
      mockVSCodeApiService.sendRequest.and.returnValue(Promise.resolve());
      
      await service.saveSettings(settings);
      
      expect(mockVSCodeApiService.sendRequest).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.SAVE_SETTINGS,
          payload: { settings }
        }),
        10000
      );
    });

    it('should reset settings', () => {
      service.resetSettings();
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.RESET_SETTINGS
        })
      );
    });

    it('should export settings', () => {
      service.exportSettings();
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.EXPORT_SETTINGS
        })
      );
    });

    it('should import settings', () => {
      const settings = { organization: 'imported', project: 'imported' };
      
      service.importSettings(settings);
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.IMPORT_SETTINGS,
          payload: { settings }
        })
      );
    });

    it('should load available models', async () => {
      const expectedModels = ['gpt-4', 'gpt-3.5-turbo'];
      mockVSCodeApiService.sendRequest.and.returnValue(Promise.resolve(expectedModels));
      
      const result = await service.loadAvailableModels();
      
      expect(result).toEqual(expectedModels);
      expect(mockVSCodeApiService.sendRequest).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.LOAD_AVAILABLE_MODELS
        }),
        10000
      );
    });
  });

  describe('repository and project methods', () => {
    it('should load repositories', async () => {
      const expectedRepos = [{ id: 1, name: 'test-repo' }];
      mockVSCodeApiService.sendRequest.and.returnValue(Promise.resolve(expectedRepos));
      
      const result = await service.loadRepositories();
      
      expect(result).toEqual(expectedRepos);
      expect(mockVSCodeApiService.sendRequest).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.LOAD_REPOSITORIES
        }),
        15000
      );
    });

    it('should load projects', async () => {
      const expectedProjects = [{ id: 1, name: 'test-project' }];
      mockVSCodeApiService.sendRequest.and.returnValue(Promise.resolve(expectedProjects));
      
      const result = await service.loadProjects();
      
      expect(result).toEqual(expectedProjects);
      expect(mockVSCodeApiService.sendRequest).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.LOAD_PROJECTS
        }),
        15000
      );
    });
  });

  describe('UI state methods', () => {
    it('should update view', () => {
      const view = 'dashboard';
      
      service.updateView(view);
      
      expect(mockVSCodeApiService.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: MessageType.UPDATE_VIEW,
          payload: { view }
        })
      );
    });
  });
});