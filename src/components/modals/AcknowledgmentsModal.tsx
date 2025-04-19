'use client';
import Modal from './Modal';

interface AcknowledgmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AcknowledgmentsModal({ isOpen, onClose }: AcknowledgmentsModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Acknowledgments"
    >
      <div className="modal-content">
        <h3>Open Source Libraries</h3>
        <p>Draft Day Trades is built with the help of these amazing open source projects:</p>
        <ul>
          <li><strong>React</strong> - A JavaScript library for building user interfaces</li>
          <li><strong>Next.js</strong> - The React framework for production</li>
          <li><strong>Firebase</strong> - Google&apos;s platform for mobile and web applications</li>
          <li><strong>Tailwind CSS</strong> - A utility-first CSS framework</li>
          <li><strong>Claude.ai</strong> - Anthropic&apos;s advanced AI assistant that helped generate and refine code for this application</li>
        </ul>
        
        <h3>People</h3>
        <p>Special thanks to:</p>
        <ul>
          <li>All beta testers (Bryan Woods) who provided valuable feedback</li>
          <li>The open source community for their continuous contributions</li>
          <li>Simbags for their support and encouragement</li>
        </ul>
      </div>
    </Modal>
  );
}