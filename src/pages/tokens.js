import '../styles/docs.css';
import { $, toast } from '../core.js';
import { mountTokenDocs } from '../token-docs.js';

mountTokenDocs($('#tokens'), toast);
