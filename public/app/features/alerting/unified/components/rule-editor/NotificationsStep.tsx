import { css } from '@emotion/css';
import { difference } from 'lodash';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useDispatch } from 'react-redux';

import { GrafanaTheme2 } from '@grafana/data';
import { Card, Link, useStyles2, useTheme2 } from '@grafana/ui';

import { Labels } from '../../../../../types/unified-alerting-dto';
import { useUnifiedAlertingSelector } from '../../hooks/useUnifiedAlertingSelector';
import { fetchAlertManagerConfigAction } from '../../state/actions';
import { FormAmRoute } from '../../types/amroutes';
import { RuleFormType, RuleFormValues } from '../../types/rule-form';
import { labelsMatchMatchers, matcherFieldToMatcher } from '../../utils/alertmanager';
import { amRouteToFormAmRoute } from '../../utils/amroutes';
import { GRAFANA_RULES_SOURCE_NAME } from '../../utils/datasource';
import { DynamicTable, DynamicTableItemProps } from '../DynamicTable';
import { Matchers } from '../silences/Matchers';

import { RuleEditorSection } from './RuleEditorSection';

export const NotificationsStep: FC = () => {
  const [hideFlowChart, setHideFlowChart] = useState(false);
  const styles = useStyles2(getStyles);
  const theme = useTheme2();

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchAlertManagerConfigAction(GRAFANA_RULES_SOURCE_NAME));
  }, [dispatch]);

  const { watch } = useFormContext<RuleFormValues>();

  const ruleType = watch('type');
  const labels = watch('labels');
  const isGrafanaRule = ruleType === RuleFormType.grafana;

  const amConfig = useUnifiedAlertingSelector((state) => state.amConfigs[GRAFANA_RULES_SOURCE_NAME])?.result;
  const [rootRoute] = amRouteToFormAmRoute(amConfig?.alertmanager_config.route);
  const labelsObject = labels.reduce<Labels>((result, current) => ({ ...result, [current.key]: current.value }), {});

  return (
    <RuleEditorSection
      stepNo={4}
      title="Notifications"
      description="Grafana handles the notifications for alerts by assigning labels to alerts. These labels connect alerts to contact points and silence alert instances that have matching labels."
    >
      <div>
        <div className={styles.hideButton} onClick={() => setHideFlowChart(!hideFlowChart)}>
          {`${!hideFlowChart ? 'Hide' : 'Show'} flow chart`}
        </div>
      </div>
      <div className={styles.contentWrapper}>
        {!hideFlowChart && (
          <img
            src={`/public/img/alerting/notification_policy_${theme.name.toLowerCase()}.svg`}
            alt="notification policy flow chart"
          />
        )}
        {isGrafanaRule && rootRoute.routes.length > 0 ? (
          <div className={styles.routesPreview}>
            <AmRoutesPolicyPreview ruleLabels={labelsObject} routes={rootRoute.routes} />
          </div>
        ) : (
          <Card className={styles.card}>
            <Card.Heading>Root route – default for all alerts</Card.Heading>
            <Card.Description>
              Without custom labels, your alert will be routed through the root route. To view and edit the root route,
              go to <Link href="/alerting/routes">notification policies</Link> or contact your admin in case you are
              using non-Grafana alert management.
            </Card.Description>
          </Card>
        )}
      </div>
    </RuleEditorSection>
  );
};

interface AmRoutesPreviewProps {
  ruleLabels: Labels;
  routes: FormAmRoute[];
}

const AmRoutesPolicyPreview = ({ ruleLabels, routes }: AmRoutesPreviewProps) => {
  const matchingRoutes = useMemo(
    () =>
      routes.filter((route) => {
        return labelsMatchMatchers(ruleLabels, route.object_matchers.map(matcherFieldToMatcher));
      }),
    [ruleLabels, routes]
  );

  const availableRoutes = difference(routes, matchingRoutes);

  const matchingTableRoutes = matchingRoutes.map<DynamicTableItemProps<FormAmRoute>>((route) => ({
    id: route.id,
    data: route,
  }));

  const availableTableRoutes = availableRoutes.map<DynamicTableItemProps<FormAmRoute>>((route) => ({
    id: route.id,
    data: route,
  }));

  return (
    <>
      <div>Matching policies</div>
      <DynamicTable
        items={matchingTableRoutes}
        cols={[
          {
            id: 'preview-matchingLabels',
            label: 'Matching labels',
            renderCell: (route) => {
              return route.data.object_matchers.length ? (
                <Matchers matchers={route.data.object_matchers.map(matcherFieldToMatcher)} />
              ) : (
                <span>Matches all alert instances</span>
              );
            },
            size: 10,
          },
          {
            id: 'preview-ContactPoints',
            label: 'Contact point',
            renderCell: (route) => route.data.receiver || '-',
            size: 5,
          },
        ]}
      />
      <div>Available policies</div>
      <DynamicTable
        cols={[
          {
            id: 'preview-available-labels',
            label: 'Labels',
            renderCell: (route) => {
              return route.data.object_matchers.length ? (
                <Matchers matchers={route.data.object_matchers.map(matcherFieldToMatcher)} />
              ) : (
                <span>Matches all alert instances</span>
              );
            },
            size: 10,
          },
          {
            id: 'preview-available-ContactPoints',
            label: 'Contact point',
            renderCell: (route) => route.data.receiver || '-',
            size: 5,
          },
        ]}
        items={availableTableRoutes}
      />
    </>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  contentWrapper: css`
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    gap: ${theme.spacing(4)};
  `,
  hideButton: css`
    color: ${theme.colors.text.secondary};
    cursor: pointer;
    margin-bottom: ${theme.spacing(1)};
  `,
  card: css`
    max-width: 500px;
    margin-left: ${theme.spacing(3)};
  `,
  routesPreview: css`
    display: flex;
    flex-direction: column;
    flex: 1;
  `,
});