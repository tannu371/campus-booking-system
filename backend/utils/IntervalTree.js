/**
 * Interval Tree Data Structure
 * Augmented BST for efficient interval overlap queries
 * O(log n) average insert/delete, O(log n + k) query where k = number of overlaps
 */

class IntervalNode {
  constructor(start, end, bookingId) {
    this.start = start; // Start time in minutes from midnight
    this.end = end; // End time in minutes from midnight
    this.bookingId = bookingId;
    this.maxEnd = end; // Augmented field: max end time in subtree
    this.left = null;
    this.right = null;
  }
}

class IntervalTree {
  constructor() {
    this.root = null;
    this.size = 0;
  }

  /**
   * Convert HH:MM time string to minutes from midnight
   */
  static timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Insert an interval into the tree
   * @param {string} startTime - HH:MM format
   * @param {string} endTime - HH:MM format
   * @param {string} bookingId - Booking ID
   */
  insert(startTime, endTime, bookingId) {
    const start = IntervalTree.timeToMinutes(startTime);
    const end = IntervalTree.timeToMinutes(endTime);
    this.root = this._insertNode(this.root, start, end, bookingId);
    this.size++;
  }

  _insertNode(node, start, end, bookingId) {
    if (!node) {
      return new IntervalNode(start, end, bookingId);
    }

    // Insert based on start time (BST property)
    if (start < node.start) {
      node.left = this._insertNode(node.left, start, end, bookingId);
    } else {
      node.right = this._insertNode(node.right, start, end, bookingId);
    }

    // Update maxEnd (augmentation)
    node.maxEnd = Math.max(node.maxEnd, end);
    if (node.left) node.maxEnd = Math.max(node.maxEnd, node.left.maxEnd);
    if (node.right) node.maxEnd = Math.max(node.maxEnd, node.right.maxEnd);

    return node;
  }

  /**
   * Query all intervals that overlap with [start, end)
   * @param {string} startTime - HH:MM format
   * @param {string} endTime - HH:MM format
   * @param {number} bufferMinutes - Buffer time to add
   * @returns {Array} Array of booking IDs that overlap
   */
  queryOverlap(startTime, endTime, bufferMinutes = 0) {
    const start = IntervalTree.timeToMinutes(startTime);
    const end = IntervalTree.timeToMinutes(endTime);
    const results = [];
    this._queryOverlapNode(this.root, start, end, bufferMinutes, results);
    return results;
  }

  _queryOverlapNode(node, start, end, buffer, results) {
    if (!node) return;

    // Check if current interval overlaps with query interval (with buffer)
    const nodeStart = node.start - buffer;
    const nodeEnd = node.end + buffer;
    
    if (start < nodeEnd && end > nodeStart) {
      results.push(node.bookingId);
    }

    // Prune left subtree if no possible overlap
    if (node.left && node.left.maxEnd + buffer > start) {
      this._queryOverlapNode(node.left, start, end, buffer, results);
    }

    // Always check right subtree if node.start < end
    if (node.right && node.start - buffer < end) {
      this._queryOverlapNode(node.right, start, end, buffer, results);
    }
  }

  /**
   * Delete an interval from the tree
   * @param {string} bookingId - Booking ID to remove
   */
  delete(bookingId) {
    this.root = this._deleteNode(this.root, bookingId);
  }

  _deleteNode(node, bookingId) {
    if (!node) return null;

    // Search for the node
    if (node.bookingId === bookingId) {
      this.size--;
      
      // Case 1: Leaf node
      if (!node.left && !node.right) {
        return null;
      }
      
      // Case 2: One child
      if (!node.left) return node.right;
      if (!node.right) return node.left;
      
      // Case 3: Two children - find inorder successor
      let successor = node.right;
      while (successor.left) {
        successor = successor.left;
      }
      
      // Copy successor data
      node.start = successor.start;
      node.end = successor.end;
      node.bookingId = successor.bookingId;
      
      // Delete successor
      node.right = this._deleteNode(node.right, successor.bookingId);
    } else {
      // Continue searching
      node.left = this._deleteNode(node.left, bookingId);
      node.right = this._deleteNode(node.right, bookingId);
    }

    // Update maxEnd after deletion
    if (node) {
      node.maxEnd = node.end;
      if (node.left) node.maxEnd = Math.max(node.maxEnd, node.left.maxEnd);
      if (node.right) node.maxEnd = Math.max(node.maxEnd, node.right.maxEnd);
    }

    return node;
  }

  /**
   * Clear the entire tree
   */
  clear() {
    this.root = null;
    this.size = 0;
  }

  /**
   * Get all intervals in sorted order (for debugging)
   */
  toArray() {
    const result = [];
    this._inorderTraversal(this.root, result);
    return result;
  }

  _inorderTraversal(node, result) {
    if (!node) return;
    this._inorderTraversal(node.left, result);
    result.push({
      bookingId: node.bookingId,
      start: node.start,
      end: node.end,
      maxEnd: node.maxEnd
    });
    this._inorderTraversal(node.right, result);
  }
}

module.exports = IntervalTree;
