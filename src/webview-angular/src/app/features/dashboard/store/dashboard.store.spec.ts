import { TestBed } from '@angular/core/testing';
import { DashboardStore, DashboardView } from './dashboard.store';
import { MessageService } from '../../../core/services/message.service';
import { PullRequestStatus } from '../../../core/models/enums';

describe('DashboardStore', () => {
  let store: InstanceType<typeof DashboardStore>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  beforeEach(() => {
    const messageServiceSpy = jasmine.createSpyObj('MessageService', [
      'loadPullRequests',
      'selectPullRequest',
      'saveConfiguration',
      'loadConfiguration',
      'testConnection',
      'updateView',
      'startAIAnalysis',
      'cancelAIAnalysis',
      'showSuccess',
      'showError'
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: MessageService, useValue: messageServiceSpy }
      ]
    });

    mockMessageService = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
    store = TestBed.inject(DashboardStore);
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      expect(store.activeView()).toBe(DashboardView.PULL_REQUEST_LIST);
      expect(store.pullRequests()).toEqual([]);
      expect(store.isLoading()).toBeFalse();
    });

    it('should have valid default configuration structure', () => {
      const config = store.configuration();
      expect(config.organizationUrl).toBe('');
      expect(config.personalAccessToken).toBe('');
      expect(config.selectedModel).toBe('gpt-4');
      expect(config.batchSize).toBe(10);
      expect(config.enableTelemetry).toBeFalse();
    });
  });

  describe('computed signals', () => {
    describe('hasValidConfiguration', () => {
      it('should return false for incomplete configuration', () => {
        expect(store.hasValidConfiguration()).toBeFalse();
      });

      it('should return true for complete configuration', () => {
        store.updateConfiguration({
          organizationUrl: 'https://dev.azure.com/test',
          personalAccessToken: 'test-token',
          selectedModel: 'gpt-4' as any
        });
        expect(store.hasValidConfiguration()).toBeTrue();
      });
    });

    describe('configurationErrors', () => {
      it('should return validation errors for empty configuration', () => {
        const errors = store.configurationErrors();
        expect(errors).toContain('Organization URL is required');
        expect(errors).toContain('Personal Access Token is required');
        expect(errors).toContain('Language model selection is required');
      });

      it('should validate batch size range', () => {
        store.updateConfiguration({ batchSize: 0 });
        const errors = store.configurationErrors();
        expect(errors).toContain('Batch size must be between 1 and 100');
      });
    });
  });

  describe('methods', () => {
    describe('loadPullRequests', () => {
      it('should load pull requests successfully', async () => {
        const mockResponse = { pullRequests: [] };
        mockMessageService.loadPullRequests.and.returnValue(Promise.resolve(mockResponse));

        await store.loadPullRequests();

        expect(store.isLoading()).toBeFalse();
        expect(store.pullRequests()).toEqual([]);
      });

      it('should handle loading errors', async () => {
        const error = new Error('Load failed');
        mockMessageService.loadPullRequests.and.returnValue(Promise.reject(error));

        await store.loadPullRequests();

        expect(store.isLoading()).toBeFalse();
        expect(store.error?.()).toBe('Load failed');
      });
    });

    describe('setActiveView', () => {
      it('should set active view and notify message service', () => {
        store.setActiveView(DashboardView.CONFIGURATION);

        expect(store.activeView()).toBe(DashboardView.CONFIGURATION);
        expect(mockMessageService.updateView).toHaveBeenCalledWith(DashboardView.CONFIGURATION);
      });
    });

    describe('updateConfiguration', () => {
      it('should update configuration successfully', async () => {
        mockMessageService.saveConfiguration.and.returnValue(Promise.resolve());
        const newConfig = { organizationUrl: 'https://new.dev.azure.com' };

        await store.updateConfiguration(newConfig);

        expect(store.configuration().organizationUrl).toBe('https://new.dev.azure.com');
        expect(store.isLoading()).toBeFalse();
        expect(mockMessageService.saveConfiguration).toHaveBeenCalled();
      });
    });

    describe('clearError', () => {
      it('should clear error state', () => {
        store.clearError();
        expect(store.error?.()).toBeUndefined();
      });
    });
  });
});