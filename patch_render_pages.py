import re

with open('src/core/AppController.js', 'r') as f:
    content = f.read()

search_block = """    const processPage = async (selectedIndex, pageNumber) => {
      const targetIndex = startIndex + selectedIndex;
      const canvas = await this.pdfProcessor.renderPage(pageNumber);
      const pageUrl = await this.pdfProcessor.canvasToBlob(canvas);
      const existingUrl = this.state.allPageImages[targetIndex];

      if (existingUrl && existingUrl !== this.state._blankPageUrl) {
        this.pdfProcessor.revokeBlobUrl(existingUrl);
      }

      this.state.allPageImages[targetIndex] = pageUrl;
      this.ui.updatePagePreview(targetIndex, pageUrl);

      completedCount++;
      const percent = Math.round((completedCount / selectedPages.length) * 100);
      this.ui.modal.setProgressCopy('Rendering pages...', `${percent}%`);
      this.ui.modal.updateProgress(percent);
    };

    try {
      for (const [selectedIndex, pageNumber] of selectedPages.entries()) {
        const trackedPromise = processPage(selectedIndex, pageNumber).finally(() => activePromises.delete(trackedPromise));
        activePromises.add(trackedPromise);

        if (activePromises.size >= CONCURRENCY_LIMIT) {
          await Promise.race(activePromises);
        }
      }

      await Promise.all(activePromises);
    } catch (error) {
      await Promise.allSettled(Array.from(activePromises));
      throw error;
    }"""

replace_block = """    const processPage = async (selectedIndex, pageNumber) => {
      try {
        const targetIndex = startIndex + selectedIndex;
        const canvas = await this.pdfProcessor.renderPage(pageNumber);
        const pageUrl = await this.pdfProcessor.canvasToBlob(canvas);
        const existingUrl = this.state.allPageImages[targetIndex];

        if (existingUrl && existingUrl !== this.state._blankPageUrl) {
          this.pdfProcessor.revokeBlobUrl(existingUrl);
        }

        this.state.allPageImages[targetIndex] = pageUrl;
        this.ui.updatePagePreview(targetIndex, pageUrl);

        completedCount++;
        const percent = Math.round((completedCount / selectedPages.length) * 100);
        this.ui.modal.setProgressCopy('Rendering pages...', `${percent}%`);
        this.ui.modal.updateProgress(percent);
      } catch (error) {
        void error;
        throw error;
      }
    };

    try {
      for (const [selectedIndex, pageNumber] of selectedPages.entries()) {
        const trackedPromise = processPage(selectedIndex, pageNumber).finally(() => activePromises.delete(trackedPromise));
        activePromises.add(trackedPromise);

        if (activePromises.size >= CONCURRENCY_LIMIT) {
          await Promise.race(activePromises);
        }
      }

      await Promise.all(activePromises);
    } catch (error) {
      await Promise.allSettled(Array.from(activePromises));
      throw error;
    }"""

content = content.replace(search_block, replace_block)

with open('src/core/AppController.js', 'w') as f:
    f.write(content)
