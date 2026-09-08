import styles from './MissingValue.module.css';

/** Unknown is distinct from an actual zero balance. */
export default function MissingValue() {
  return <span className={styles.missing} aria-label="No data">—</span>;
}
