'use client';
import Modal from './Modal';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Privacy Policy"
    >
      <div className="modal-content">
        <h3>Information We Collect</h3>
        <p>We collect information you provide directly to us, such as when you create or modify your account, request services, contact customer support, or otherwise communicate with us. This includes:</p>
        <ul>
          <li><strong>Account Information</strong> - Your email address and display name</li>
          <li><strong>Profile Preferences</strong> - Your icon selection and display settings</li>
          <li><strong>League Information</strong> - League IDs, membership status, and league participation data</li>
          <li><strong>Draft Predictions</strong> - Your prediction lists and history of picks</li>
          <li><strong>Usage Information</strong> - How you interact with our services</li>
        </ul>
        
        <h3>How We Use Your Information</h3>
        <p>We use the information we collect to provide, maintain, and improve our services, including to:</p>
        <ul>
          <li>Create and update your account</li>
          <li>Process and display your predictions</li>
          <li>Track league participation and memberships</li>
          <li>Calculate and display leaderboards</li>
          <li>Send you technical notices and support messages</li>
          <li>Respond to your comments and questions</li>
          <li>Maintain and improve the security of our platform</li>
        </ul>
        
        <h3>Data Retention</h3>
        <p>We retain your information as long as your account is active or as needed to provide you services. This includes your email address, name, icon preferences, league participation data, and prediction history. We will also retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements.</p>
        
        <h3>Data Sharing</h3>
        <p>Your display name and predictions may be visible to other members of leagues you join. We do not sell or share your personal information with third parties for marketing purposes.</p>
        
        <h3>Contact Us</h3>
        <p>If you have any questions about this Privacy Policy or the data we collect, please contact us at:</p>
        <p><a href="mailto:sean.munley@protonmail.com">sean.munley@protonmail.com</a></p>
      </div>
    </Modal>
  );
}