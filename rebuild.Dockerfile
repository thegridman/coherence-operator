#
# Copyright (c) 2025, Oracle and/or its affiliates.
# Licensed under the Universal Permissive License v 1.0 as shown at
# http://oss.oracle.com/licenses/upl.
#
ARG BASE_IMAGE
FROM $BASE_IMAGE

COPY bin/build-date.txt /files/build-date.txt
