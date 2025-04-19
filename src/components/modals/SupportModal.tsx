'use client';
import Modal from './Modal';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Support"
      maxWidth="max-w-md"
    >
      <div className="modal-content">
        <p>Need help with Draft Day Trades? Have a suggestion or found a bug? We&apos;d love to hear from you!</p>
        
        <h3>Contact us</h3>
        <p>For support, feature requests, or bug reports, please email:</p>
        <p>
          <a href="mailto:sean.munley@protonmail.com">
            sean.munley@protonmail.com
          </a>
        </p>
        
        <h3>Response time</h3>
        <p>We typically respond to all inquiries within 24-48 hours during business days.</p>
        
        <h3>Feature requests</h3>
        <p>When suggesting new features, please include as much detail as possible about how you envision the feature working and why it would be valuable.</p>
        
        <h3>Bug reports</h3>
        <p>When reporting bugs, please include:</p>
        <ul>
          <li>A description of what happened</li>
          <li>What you expected to happen</li>
          <li>Steps to reproduce the issue</li>
          <li>Your device and browser information</li>
        </ul>
      </div>
    </Modal>
  );
}