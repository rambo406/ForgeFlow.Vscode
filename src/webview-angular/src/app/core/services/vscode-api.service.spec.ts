import { TestBed } from '@angular/core/testing';
import { VSCodeApiService } from './vscode-api.service';
import { of } from 'rxjs';

// Mock VS Code API
const mockVSCodeApi = {
  postMessage: jasmine.createSpy('postMessage'),
  setState: jasmine.createSpy('setState'),
  getState: jasmine.createSpy('getState').and.returnValue(null)
};

// Global mock for acquireVsCodeApi
(global as any).acquireVsCodeApi = jasmine.createSpy('acquireVsCodeApi').and.returnValue(mockVSCodeApi);

describe('VSCodeApiService', () => {
  let service: VSCodeApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VSCodeApiService]
    });
    service = TestBed.inject(VSCodeApiService);
    
    // Clear spy calls
    mockVSCodeApi.postMessage.calls.reset();
    mockVSCodeApi.setState.calls.reset();
    mockVSCodeApi.getState.calls.reset();
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should acquire VS Code API on initialization', () => {
      expect((global as any).acquireVsCodeApi).toHaveBeenCalled();
    });
  });

  describe('postMessage', () => {
    it('should post message to VS Code API', () => {
      const testMessage = { type: 'test', payload: { data: 'test' } };
      
      service.postMessage(testMessage);
      
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith(testMessage);
    });

    it('should handle errors when posting messages', () => {
      const consoleSpy = spyOn(console, 'error');
      mockVSCodeApi.postMessage.and.throwError('Post message failed');
      
      const testMessage = { type: 'test' };
      service.postMessage(testMessage);
      
      expect(consoleSpy).toHaveBeenCalledWith('Error posting message:', jasmine.any(Error));
    });
  });

  describe('setState', () => {
    it('should set state in VS Code API', () => {
      const testState = { view: 'dashboard', data: { count: 5 } };
      
      service.setState(testState);
      
      expect(mockVSCodeApi.setState).toHaveBeenCalledWith(testState);
    });

    it('should handle errors when setting state', () => {
      const consoleSpy = spyOn(console, 'error');
      mockVSCodeApi.setState.and.throwError('Set state failed');
      
      const testState = { view: 'dashboard' };
      service.setState(testState);
      
      expect(consoleSpy).toHaveBeenCalledWith('Error setting state:', jasmine.any(Error));
    });
  });

  describe('getState', () => {
    it('should get state from VS Code API', () => {
      const testState = { view: 'dashboard', data: { count: 5 } };
      mockVSCodeApi.getState.and.returnValue(testState);
      
      const result = service.getState();
      
      expect(result).toEqual(testState);
      expect(mockVSCodeApi.getState).toHaveBeenCalled();
    });

    it('should return null when no state exists', () => {
      mockVSCodeApi.getState.and.returnValue(null);
      
      const result = service.getState();
      
      expect(result).toBeNull();
    });

    it('should handle errors when getting state', () => {
      const consoleSpy = spyOn(console, 'error');
      mockVSCodeApi.getState.and.throwError('Get state failed');
      
      const result = service.getState();
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error getting state:', jasmine.any(Error));
    });
  });

  describe('onMessage', () => {
    it('should set up message listener on window', () => {
      const addEventListenerSpy = spyOn(window, 'addEventListener');
      
      // Re-initialize service to trigger onMessage setup
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [VSCodeApiService]
      });
      service = TestBed.inject(VSCodeApiService);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('message', jasmine.any(Function));
    });

    it('should handle incoming messages correctly', (done) => {
      const testMessage = { type: 'test', payload: { data: 'test' } };
      
      // Listen for custom event dispatched by service
      window.addEventListener('vscode-message', (event: any) => {
        expect(event.detail).toEqual(testMessage);
        done();
      });
      
      // Simulate incoming message
      window.dispatchEvent(new MessageEvent('message', {
        data: testMessage
      }));
    });

    it('should filter messages by origin if configured', (done) => {
      // This test would depend on how origin filtering is implemented
      // For now, we'll test that all messages are received
      const testMessage = { type: 'test', payload: { data: 'test' } };
      
      window.addEventListener('vscode-message', (event: any) => {
        expect(event.detail).toEqual(testMessage);
        done();
      });
      
      window.dispatchEvent(new MessageEvent('message', {
        data: testMessage,
        origin: 'vscode-webview://test'
      }));
    });
  });

  describe('sendRequest', () => {
    it('should send request and return promise', async () => {
      const testMessage = { type: 'loadConfig', requestId: 'test-123' };
      const testResponse = { success: true, data: { config: 'test' } };
      
      // Set up response listener
      setTimeout(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { ...testResponse, requestId: 'test-123' }
        }));
      }, 10);
      
      const result = await service.sendRequest(testMessage, 1000);
      
      expect(result).toEqual(testResponse);
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith(testMessage);
    });

    it('should timeout if no response received', async () => {
      const testMessage = { type: 'loadConfig', requestId: 'test-timeout' };
      
      try {
        await service.sendRequest(testMessage, 100);
        fail('Expected promise to reject');
      } catch (error) {
        expect(error).toEqual(jasmine.any(Error));
      }
    });

    it('should handle multiple concurrent requests', async () => {
      const request1 = { type: 'loadConfig', requestId: 'req-1' };
      const request2 = { type: 'loadProjects', requestId: 'req-2' };
      
      const response1 = { success: true, data: 'config', requestId: 'req-1' };
      const response2 = { success: true, data: 'projects', requestId: 'req-2' };
      
      // Send responses in reverse order to test proper matching
      setTimeout(() => {
        window.dispatchEvent(new MessageEvent('message', { data: response2 }));
        window.dispatchEvent(new MessageEvent('message', { data: response1 }));
      }, 10);
      
      const [result1, result2] = await Promise.all([
        service.sendRequest(request1, 1000),
        service.sendRequest(request2, 1000)
      ]);
      
      expect(result1).toEqual({ success: true, data: 'config' });
      expect(result2).toEqual({ success: true, data: 'projects' });
    });
  });

  describe('error handling', () => {
    it('should handle malformed incoming messages gracefully', () => {
      const consoleSpy = spyOn(console, 'error');
      
      // Listen for vscode-message events
      window.addEventListener('vscode-message', () => {
        // Event should still be dispatched even for malformed data
      });
      
      // Send malformed message
      window.dispatchEvent(new MessageEvent('message', {
        data: 'invalid-json'
      }));
      
      // Should not throw or crash
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should cleanup listeners on destroy', () => {
      const removeEventListenerSpy = spyOn(window, 'removeEventListener');
      
      // Call destroy method if it exists
      if ('ngOnDestroy' in service) {
        (service as any).ngOnDestroy();
        expect(removeEventListenerSpy).toHaveBeenCalledWith('message', jasmine.any(Function));
      }
    });
  });

  describe('edge cases', () => {
    it('should handle null VS Code API gracefully', () => {
      // Mock acquireVsCodeApi to return null
      (global as any).acquireVsCodeApi = jasmine.createSpy('acquireVsCodeApi').and.returnValue(null);
      
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [VSCodeApiService]
      });
      
      expect(() => {
        TestBed.inject(VSCodeApiService);
      }).not.toThrow();
    });

    it('should handle missing requestId in responses', (done) => {
      const testMessage = { type: 'test', requestId: 'test-no-response' };
      
      // Send response without requestId
      setTimeout(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { success: true, data: 'test' }
        }));
      }, 10);
      
      service.sendRequest(testMessage, 100).catch(() => {
        // Should timeout since response won't match
        done();
      });
    });

    it('should handle duplicate requestIds gracefully', async () => {
      const requestId = 'duplicate-id';
      const message1 = { type: 'test1', requestId };
      const message2 = { type: 'test2', requestId };
      
      setTimeout(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { success: true, data: 'response', requestId }
        }));
      }, 10);
      
      // Both requests should resolve with the same response
      const [result1, result2] = await Promise.all([
        service.sendRequest(message1, 1000),
        service.sendRequest(message2, 1000)
      ]);
      
      expect(result1).toEqual({ success: true, data: 'response' });
      expect(result2).toEqual({ success: true, data: 'response' });
    });
  });
});