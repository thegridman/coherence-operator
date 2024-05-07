package com.oracle.coherence.idrs;

public interface Constants
    {
    String PROP_TOPIC = "coherence.test.topic";

    String PROP_GROUP = "coherence.test.group";

    String PROP_STATE_TOPIC = "coherence.test.state.topic";

    String PROP_STATE_GROUP = "coherence.test.state.group";

    String PROP_PUBLISH_DELAY = "coherence.test.publish.delay";

    String PROP_SUBSCRIBER_MIN_TTL = "coherence.test.subscriber.min.ttl";

    String PROP_SUBSCRIBER_EXTRA_TTL = "coherence.test.subscriber.extra.ttl";

    String DEFAULT_TOPIC = "test";

    String DEFAULT_GROUP = "test-group";

    String DEFAULT_STATE_TOPIC = "test-state";

    String DEFAULT_STATE_GROUP= "test-state-group";

    long DEFAULT_PUBLISH_DELAY = 10L;

    int DEFAULT_SUBSCRIBER_MIN_TTL = 60;

    int DEFAULT_SUBSCRIBER_EXTRA_TTL = 60;
    }
