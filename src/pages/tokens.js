import '../styles/docs.css';
import { $, toast } from '../core.js';
import { mountTokenDocs } from '../token-docs.js';
import { bindClear } from '../ui/forms.js';

mountTokenDocs($('#tokens'), toast);
bindClear($('#tokens'));
