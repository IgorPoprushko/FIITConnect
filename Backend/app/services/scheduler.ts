import ChannelCleanupService from '#services/channel_cleanup_service'

class Scheduler {
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

  /**
   * Start the scheduler
   * Runs channel cleanup every 24 hours
   */
  public start() {
    console.log('[SCHEDULER] Starting channel cleanup scheduler...')

    // Run cleanup immediately on start
    void this.runCleanup()

    // Schedule cleanup to run every 24 hours
    this.cleanupInterval = setInterval(() => {
      void this.runCleanup()
    }, this.CLEANUP_INTERVAL)

    console.log(
      `[SCHEDULER] Scheduler started. Cleanup will run every ${this.CLEANUP_INTERVAL / (1000 * 60 * 60)} hours.`
    )
  }

  /**
   * Stop the scheduler
   */
  public stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      console.log('[SCHEDULER] Scheduler stopped.')
    }
  }

  /**
   * Run the cleanup task
   */
  private async runCleanup() {
    const now = new Date().toISOString()
    console.log(`[SCHEDULER] Running channel cleanup at ${now}...`)

    try {
      const cleanupService = new ChannelCleanupService()

      // Get stats before cleanup
      const statsBefore = await cleanupService.getChannelActivityStats()
      console.log('[SCHEDULER] Channel stats before cleanup:', statsBefore)

      // Run cleanup
      const result = await cleanupService.cleanupInactiveChannels()

      console.log(
        `[SCHEDULER] Cleanup completed. Deleted ${result.deletedCount} channels:`,
        result.deletedChannels
      )

      // Get stats after cleanup
      const statsAfter = await cleanupService.getChannelActivityStats()
      console.log('[SCHEDULER] Channel stats after cleanup:', statsAfter)
    } catch (error) {
      console.error('[SCHEDULER] Error during cleanup:', error)
    }
  }

  /**
   * Manually trigger cleanup (useful for testing)
   */
  public async triggerCleanup() {
    await this.runCleanup()
  }
}

// Export singleton instance
export default new Scheduler()
